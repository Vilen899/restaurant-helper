const express = require("express");
const cors = require("cors");
const net = require("net");

const app = express();
app.use(cors());
app.use(express.json());

const KKM_IP = "192.168.8.168";
const KKM_PORT = 8080;

// Проверка связи
app.get("/kkm/status", async (req, res) => {
  const client = new net.Socket();
  let responded = false;

  client.connect(KKM_PORT, KKM_IP, () => {
    responded = true;
    client.destroy();
    res.json({ ok: true, message: "KKM reachable" });
  });

  client.on("error", err => {
    if (!responded) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
});

// Отправка команды (raw)
app.post("/kkm/send", async (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "command required" });
  }

  const client = new net.Socket();
  let data = "";

  client.connect(KKM_PORT, KKM_IP, () => {
    client.write(command);
  });

  client.on("data", chunk => {
    data += chunk.toString();
  });

  client.on("end", () => {
    res.json({ response: data });
  });

  client.on("error", err => {
    res.status(500).json({ error: err.message });
  });
});

app.listen(3001, () => {
  console.log("KKM bridge running on http://localhost:3001");
});
