const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
require("dotenv").config();
require("express-async-errors");
require("./startup/cloudinary");
const barrel = require("./routes/barrel");
const portable = require("./routes/portable");
const tub = require("./routes/tub");
const user = require("./routes/user");
const footer = require("./routes/footer");
const priceRange = require("./routes/priceRange");
const auth = require("./routes/auth");
const connectDb = require("./startup/db");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/barrels", barrel);
app.use("/api/portables", portable);
app.use("/api/tubs", tub);
app.use("/api/users", user);
app.use("/api/price-range", priceRange);
app.use("/api/auth", auth);
app.use("/api/footer", footer);

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
});
