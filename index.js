const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});
const port = process.env.PORT || 5500;
const ipAddress = "192.168.0.110";

app.get("/", (req, res) => {
  res.send("scanner backend with socket io");
});

let productStore = [];

io.on("connection", (socket) => {
  console.log("new user connect");

  // received user info
  socket.on("productInfo", (info) => {
    const existingProductIndex = productStore.findIndex(
      (dt) => dt.id === info.id
    );

    if (existingProductIndex !== -1) {
      // If product exists, update the quantity
      productStore = productStore.map((product, index) => {
        if (index === existingProductIndex) {
          return { ...product, qty: product.qty + 1 };
        }
        return product;
      });
    } else {
      // If product doesn't exist, add a new entry
      productStore = [
        ...productStore,
        {
          productionDate: info.productionDate,
          block: info.block,
          shift: info.shift,
          id: info.id,
          qty: 1,
        },
      ];
    }

    socket.emit("broadcast", productStore);

    socket.broadcast.emit("broadcast", productStore);

    console.log("info -> ", productStore);
  });

  socket.emit("getValue", productStore);

  // socket.broadcast.emit("broadcast", productStore);

  // disconnect
  socket.on("disconnect", () => {
    console.log("old user disconnect");
  });
});

http.listen(port, ipAddress, () => {
  console.log(`Socket.IO server running at http://${ipAddress}:${port}/`);
});
