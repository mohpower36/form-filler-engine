const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/analyze", async (req, res) => {
    try {
        let url = req.body.url;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        if (url.includes("/formResponse")) {
            url = url.replace("/formResponse", "/viewform");
        }

        const response = await axios.get(url, { timeout: 10000 });
        const content = response.data;
        
        const startStr = "var FB_PUBLIC_LOAD_DATA_ = ";
        const startIdx = content.indexOf(startStr);
        
        if (startIdx === -1) {
            return res.status(400).json({ error: "Could not find form data. Ensure link is public and correct." });
        }
        
        let contentSub = content.substring(startIdx + startStr.length);
        let endIdx = contentSub.indexOf(";</script>");
        
        if (endIdx === -1) {
            endIdx = contentSub.indexOf("</script>");
            if (endIdx === -1) {
                return res.status(400).json({ error: "Could not parse form data." });
            }
        }
        
        let jsonDataStr = contentSub.substring(0, endIdx).trim();
        if (jsonDataStr.endsWith(';')) {
            jsonDataStr = jsonDataStr.substring(0, jsonDataStr.length - 1);
        }
        
        const formData = JSON.parse(jsonDataStr);
        const formTitle = formData[3];
        const fieldsData = formData[1][1];
        
        const extractedFields = [];
        if (fieldsData) {
            for (const field of fieldsData) {
                const fieldName = field[1];
                const fieldType = field[3];
                let options = [];
                let entryId = null;
                
                if (field.length > 4 && field[4]) {
                    for (const entryData of field[4]) {
                        entryId = entryData[0];
                        if (entryData.length > 1 && entryData[1]) {
                            options = entryData[1].filter(opt => opt && opt[0]).map(opt => opt[0]);
                        }
                    }
                }
                
                if (entryId) {
                    extractedFields.push({
                        name: fieldName,
                        type: fieldType,
                        id: `entry.${entryId}`,
                        options: options
                    });
                }
            }
        }
        
        return res.json({ title: formTitle, fields: extractedFields });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

app.post("/submit_single", async (req, res) => {
    try {
        let url = req.body.url;
        const payload = req.body.payload;
        
        if (url.includes("/viewform")) {
            url = url.replace("/viewform", "/formResponse");
        }
        
        const response = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        
        if (response.status === 200) {
            return res.json({ status: "success" });
        } else {
            return res.status(400).json({ status: "error", message: `Status code ${response.status}` });
        }
    } catch (e) {
        return res.status(500).json({ status: "error", message: e.message });
    }
});

exports.api = functions.https.onRequest(app);
