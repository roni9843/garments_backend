const express = require("express");
const http = require("http"); // Change here
const app = express();
const server = http.createServer(app); // Change here
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");

const port = process.env.PORT || 8080;

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://organicUser:roni9843@cluster0.tibcl.mongodb.net/Garment_stock",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Define Product schema
const productSchema = new mongoose.Schema({
  productionDate: String,
  product_name: String,
  block: String,
  shift: String,
  id: String,
  qty: Number,
});

const Product = mongoose.model("Product", productSchema);

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "Image"));
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    cb(null, `${timestamp}_${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

app.use(express.json());

app.get("/", (req, res) => {
  res.send("scanner backend with socket io");
});

app.get("/display", (req, res) => {
  res.sendFile(path.join(__dirname, "display.html"));
});

app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "upload.html"));
});

// Handle the form submission with the image upload
app.post("/upload", upload.single("image"), (req, res) => {
  console.log("Image uploaded:", req.file.filename);
  res.send("Image uploaded successfully");
});

// Route to get all products
app.get("/getProduct", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

io.on("connection", (socket) => {
  console.log("new user connect");

  const emitProductValues = async () => {
    try {
      const products = await Product.find();
      socket.emit("getValue", products);
    } catch (error) {
      console.error(error);
    }
  };

  // received user info
  socket.on("productInfo", async (info) => {
    try {
      const existingProduct = await Product.findOne({ id: info.id });

      if (existingProduct) {
        // If product exists, update the quantity
        existingProduct.qty += 1;
        await existingProduct.save();
      } else {
        // If product doesn't exist, add a new entry
        const newProduct = new Product({
          productionDate: info.productionDate,
          product_name: info.product_name,
          block: info.block,
          shift: info.shift,
          id: info.id,
          qty: 1,
        });
        await newProduct.save();
      }

      const productStore = await Product.find();
      socket.emit("broadcast", productStore);
      socket.broadcast.emit("broadcast", productStore);

      console.log("info -> ", productStore);

      emitProductValues(); // Call the function to emit product values after updating
    } catch (error) {
      console.error(error);
    }
  });

  emitProductValues(); // Initial emission of product values

  // disconnect
  socket.on("disconnect", () => {
    console.log("old user disconnect");
  });
});
server.listen(port, () => {
  console.log(`Socket.IO server running at http://$:${port}/`);
});
