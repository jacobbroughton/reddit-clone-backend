const express = require("express")
const router = express.Router()
const db = require("../db")
const bcrypt = require("bcryptjs")
const passport = require("passport")
require("../middleware/passportConfig")(passport)
const { check, param } = require("express-validator")
const checkForErrors = require("../middleware/validationUtils")
require("dotenv").config()
const { encode } = require("html-entities")
const { isAuth } = require("../middleware/authMiddleware")

// Get User
router.get(
  "/get-user/:username",
  isAuth,
  [
    param("username")
      .notEmpty()
      .withMessage("Must include a username to get a user"),
  ],
  (req, res) => {
    const validatorFailed = checkForErrors(req, res)

    if (validatorFailed) return

    const { username } = req.params

    let searchForUserStatement = `
      SELECT id, username, gender, profile_picture, created_at, updated_at FROM users 
      WHERE username = ?
      LIMIT 1
  `

    db.query(searchForUserStatement, [username], (err, rows) => {
      if (err) {
        res.statusMessage = "Could not find user"
        res.status(404)
      } else {
        res.send(rows[0])
      }
    })
  }
)

// Log In
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      res.statusMessage = "Error while logging in, please try again."
      res.status(404)
      // throw err
    }
    if (!user) {
      res.statusMessage = "Username or password is incorrect"
      res.status(401).end()
    } else {
      req.login(user, (err) => {
        if (err) {
          res.statusMessage = "User does exist, but there was an error..."
          res.status(404).end()
        } else {
          console.log("Gets here boii")
          res.statusMessage = "Successfully authenticated";
          res.status(200).send(user)
        }
      })
    }
  })(req, res, next)
})

// Log Out
router.post("/logout", isAuth, (req, res, next) => {
  req.logout()
  req.session.destroy((err) => {
    if (err) return next(err)
    return res.send({ authenticated: req.isAuthenticated() })
  })
})

// Register
router.post(
  "/register",
  [
    check("username").notEmpty().withMessage("Username cannot be empty").trim(),
    check("gender").notEmpty().withMessage("Gender cannot be empty").trim(),
    check("profilePicture").notEmpty(),
    check("updatedAt").notEmpty(),
  ],
  (req, res) => {
    const validatorFailed = checkForErrors(req, res)

    if (validatorFailed) return

    let { username } = encode(req.body)


    let searchForUserStatement = `
        SELECT * FROM users 
        WHERE username = ? 
        LIMIT 1
    `

    db.query(searchForUserStatement, [username], async (err, rows) => {
      if (err) {
        res.statusMessage = "Something happened while searching for the user, try again."
        res.status(404)
      }
      if (rows[0]) {
        res.statusMessage = "User already exists"
        res.status(404)
      }
      if (!rows[0]) {
        let { username, gender, profilePicture, updatedAt } = req.body

        username = encode(username)
        gender = encode(gender)

        const hashedPassword = await bcrypt.hash(req.body.password, 10)

        let insertUserStatement = `
        INSERT INTO users 
        (username, password, gender, profile_picture, updated_at) 
        VALUES 
        (?, ?, ?, ?, ?)
      `

        db.query(
          insertUserStatement,
          [username, hashedPassword, gender, profilePicture, updatedAt],
          (err) => {
            if (err) {
              res.statusMessage = "Error while registering, please try again."
              res.status(404)
            } else {
              res.send(req.body)
            }
          }
        )
      }
    })
  }
)

module.exports = router
