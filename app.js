import express from "express";
import {readFile, writeFile} from "fs/promises";
import {createServer} from 'http';
import crypto from 'crypto';
import path from "path";
import {json} from "stream/consumers";

const app = express();

const PORT = process.env.PORT || 3004;

const DATA_FILE = path.join("data", "links.json");

const loadLinks = async() => {
    try{
        const data = await readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    }catch(err){
        if(err.code === 'ENOENT'){
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw err;
    }
}

const saveLinks = async(links) => {
    await writeFile(DATA_FILE, JSON.stringify(links));
}

app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));

app.get("/",async (req,res)=>{
    try{
        const file = await readFile(path.join("views","index.html"));
        const links = await loadLinks();

        const content = file.toString().replaceAll(
            "{{Shortened_Urls}}",
            Object.entries(links)
                .map(
                    ([shortCode,url])=>
                        `<li><a href="/${shortCode}" target="_blank">${req.hostname}/${shortCode}</a> - ${url}</li>`
                    )
                .join(" ")
        );

        res.send(content);
    }catch(err){
        console.log(err);
        return res.status(500).send("Some error occured");
    }
});

app.post("/",async(req,res)=>{
    try{
        const {url , shortCode} = req.body; 
        const finalshortCode = shortCode || crypto.randomBytes(4).toString("hex");

        const links = await loadLinks();

        if(links[finalshortCode]){
            return res
            .status(400)
            .send("Shortcode already in use");
        }

        links[finalshortCode] = url;
        await saveLinks(links);
        return res.redirect("/");
    }catch(err){
        console.log(err);
        return res.status(500).send("Some error occured!!!");
    }
});

app.get("/:shortCode",async(req,res)=>{
    try{
        const {shortCode} = req.params;
        const links = await loadLinks();
        
        if(!links[shortCode]){
            return res.status(404).send("Link not found");
        }   

        return res.redirect(links[shortCode]);
    }catch(err){
        console.log(err);
        return res.status(500).send("Some error occured");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})