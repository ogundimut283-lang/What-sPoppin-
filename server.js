// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import OpenAI from "openai";

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// // === THE ONLY ROUTE YOU NEED ===
// app.post("/api/openai", async (req, res) => {
//   try {
//     const { prompt, model } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: "Missing prompt" });
//     }

//     const completion = await openai.chat.completions.create({
//       model: model || "gpt-4.1-mini",
//       messages: [
//         { role: "system", content: "You are Poppy, an enthusiastic party planner." },
//         { role: "user", content: prompt }
//       ]
//     });

//     res.json({ output: completion.choices[0].message.content });

//   } catch (err) {
//     console.error("🔥 OPENAI ERROR:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // app.listen(3000, () => console.log("✅ API running on http://localhost:3000"));
// app.listen(3000, () => {
//   console.log("✅ Server running on http://localhost:3000");

// });

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/openai", async (req, res) => {
  try {
    const { prompt, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const completion = await openai.chat.completions.create({
      model: model || "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are Poppy, an enthusiastic party planner." },
        { role: "user", content: prompt }
      ]
    });

    res.json({ output: completion.choices[0].message.content });

  } catch (err) {
    console.error("🔥 OPENAI ERROR:", err);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
  console.log("Loaded routes: /api/openai");
});
