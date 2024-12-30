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
  origin: ['http://localhost:3000','http://localhost:5173','https://jeevan-bay.vercel.app','http://localhost:3001'], // Replace with your frontend URL
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
const community = require("./routes/community");
const transaction = require("./routes/transaction");
const familyRoutes = require("./routes/familyRoutes");
const parishupload = require("./routes/parishexcel");
const koottaymaupload = require("./routes/koottaymaexcel");
const familiesupload = require("./routes/familyexcel");
const personupload = require("./routes/personexcel");
const transupload = require("./routes/transexcel");
const allocationSettings = require("./routes/allocationsettings");
const communitySettings=require("./routes/communitysetting");
const slab=require("./routes/slabRoutes");
const fund = require("./routes/fund");
const projects = require("./routes/ProjectsRouter");
const projectSettingsRoutes = require("./routes/projectSettingsRoutes");
const parishdata = require("./routes/parishData");
const familymovements  = require("./routes/familyMovement");
const personmovements  = require("./routes/personMovementRoutes");
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  secure: process.env.NODE_ENV === 'production',
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
app.use("/community", community);
app.use("/transaction", transaction);
app.use("/families", familyRoutes);
app.use("/parishup", parishupload);
app.use("/koottaymaup", koottaymaupload);
app.use("/familiesup", familiesupload);
app.use("/personup", personupload);
app.use("/transup", transupload);
app.use("/allocationsettings", allocationSettings);
app.use('/community-settings', communitySettings);
app.use('/slabs', slab);
app.use("/fund", fund);
app.use("/parishdata", parishdata);
app.use('/project-settings', projectSettingsRoutes);
app.use('/family-movements', familymovements);
app.use('/person-movements', personmovements);
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
