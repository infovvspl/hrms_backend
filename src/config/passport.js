const passport = require("passport");

const GoogleStrategy =
  require("passport-google-oauth20").Strategy;

const pool = require("./database");

const generateToken =
  require("../utils/generateToken");


// ================= GOOGLE STRATEGY =================
passport.use(

  new GoogleStrategy(

    {
      clientID:
        process.env.GOOGLE_CLIENT_ID,

      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET,

      callbackURL:
        "/api/auth/google/callback",
    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {

      try {

        // ================= GOOGLE DATA =================
        const name =
          profile.displayName;

        const email =
          profile.emails[0].value;

        const google_id =
          profile.id;

        const profile_pic =
          profile.photos[0].value;


        // ================= CHECK COMPANY =================
        const existingCompany =
          await pool.query(

            `
          SELECT *
          FROM company
          WHERE email = $1
          `,

            [email]
          );

        let company;


        // ================= COMPANY EXISTS =================
        if (
          existingCompany.rows.length > 0
        ) {

          const updatedCompany =
            await pool.query(
              `
            UPDATE company
            SET
              google_id = $1,
              profile_pic = $2,
              login_type = 'google',
              is_verified = true,
              updated_at = CURRENT_TIMESTAMP
            WHERE email = $3
            RETURNING *
            `,
              [
                google_id,
                profile_pic,
                email,
              ]
            );

          company =
            updatedCompany.rows[0];

        } else {

          // ================= CREATE NEW COMPANY =================
          const newCompany =
            await pool.query(

              `
            INSERT INTO company
            (
              company_name,
              email,
              google_id,
              profile_pic,
              login_type,
              is_verified
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,

              [
                name,
                email,
                google_id,
                profile_pic,
                "google",
                true,
              ]
            );

          company =
            newCompany.rows[0];
        }


        // ================= GENERATE JWT =================
        const token =
          generateToken(company);


        // ================= SUCCESS =================
        return done(null, {
          company,
          token,
        });

      } catch (error) {

        console.log(error);

        return done(error, null);
      }
    }
  )
);


// ================= SERIALIZE =================
passport.serializeUser(
  (user, done) => {

    done(null, user);
  }
);


// ================= DESERIALIZE =================
passport.deserializeUser(
  (user, done) => {

    done(null, user);
  }
);