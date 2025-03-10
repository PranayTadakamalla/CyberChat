import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendVerificationEmail, generateVerificationCode, getVerificationExpiry } from "./email";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.isVerified) {
            return done(null, false, { message: "Please verify your email first" });
          }

          if (!(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user._id?.toString() || user.id?.toString());
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const verificationCode = generateVerificationCode();
      const verificationExpiry = getVerificationExpiry();

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      await storage.updateVerificationCode(user.email, verificationCode, verificationExpiry);
      await sendVerificationEmail(user.email, verificationCode);

      res.status(201).json({ message: "Registration successful. Please check your email for verification code." });
    } catch (error) {
      console.error('Registration error:', error);

      // Check if it's an email sending error
      if (error instanceof Error && error.message.includes('Email verification failed')) {
        return res.status(500).json({ 
          message: `Email verification failed: The from address does not match a verified Sender Identity. Please contact support to verify your sender email address in SendGrid.` 
        });
      }

      res.status(500).json({ message: "Registration failed. Please try again later." });
    }
  });

  app.post("/api/verify", async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    try {
      const isValid = await storage.verifyUser(email, code);
      if (isValid) {
        const user = await storage.getUserByEmail(email);
        if (user) {
          req.login(user, (err) => {
            if (err) {
              console.error('Login error:', err);
              return res.status(500).json({ message: "Login failed after verification" });
            }
            res.json({ message: "Email verified successfully" });
          });
        }
      } else {
        res.status(400).json({ message: "Invalid or expired verification code" });
      }
    } catch (error) {
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}