require("dotenv").config({ path: "./config/.env" });

const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const cookieParser = require("cookie-parser");
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const mongoose = require("mongoose");
const passport = require('passport');
const session = require('express-session');
require('./config/passport');
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const options = require("./config/swaggerOptions");
const authRoutes = require('./routes/auth');
const app = express();

const port = process.env.PORT || 5000;
connectDB();
app.use(logger);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: ['http://localhost:3000','http://localhost:5173'], // Replace with your frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','HEAD','PATCH'],
}));
//app.use(cors(corsOptions));

const forane = require("./routes/forane");
const parish = require("./routes/parish");
const auth = require("./routes/auth");
const koottayma = require("./routes/koottayma");
const family = require("./routes/family");
const person = require("./routes/person");
const transaction = require("./routes/transaction");
const familyRoutes = require("./routes/familyRoutes");
const parishupload = require("./routes/parishexcel");
const koottaymaupload = require("./routes/koottaymaexcel");
const familiesupload = require("./routes/familyexcel");
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.status(200);
});
//app.use("/auth", auth);
app.use("/forane", forane);
app.use("/parish", parish);
app.use("/koottayma", koottayma);
app.use("/family", family);
app.use("/person", person);
app.use("/transaction", transaction);
app.use("/families", familyRoutes);
app.use("/parishup", parishupload);
app.use("/koottaymaup", koottaymaupload);
app.use("/familiesup", familiesupload);

const specs = swaggerJsdoc(options);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);


app.use('/auth', authRoutes);
app.use((req, res, next) => {
  console.log('Session:', req.session);
  next();
});
app.use(errorHandler);

mongoose.connection.once("open", () => {
  app.listen(port, () => console.log(`Server running on port ${port}`));
});

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
