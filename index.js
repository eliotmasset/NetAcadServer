/***
 *
 * So, you read the codes?
 * Author: Aimuhire
 * This is nodejs, express and cheerio in action.
 *
 * Comment: Well, show me one CST kid who never cheats CCNA Online tests and I'll regret having this idea.
 * We waste time copying answers from the internet while we should be doing important things... like watching movies.
 * The extension is a proof of concept... "for education purposes" ha ha ha!
 *
 * technical: We have a class Scrapper @ ./Scrapper.js it does all the dirty scrapping work.
 *
 */
const express = require("express");
const fs = require("fs");
const https = require('https');
var bodyParser = require("body-parser");

const Scrapper = require("./Scrapper");
const examModel = require("./examModel");
const examLinks = require("./allExamLinks");
const credentials = require("./credentials");

const port = 3000;

const app = express();


app.use(bodyParser.json());
app.use((req, res, next) => {
  res.append("Access-Control-Allow-Origin", ["*"]);
  res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.append("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/pop/:url", (req, res) => {
  console.log(req.params.url);
  populateTheDb(req, res);
});

app.get("/q/:q", (req, res) => {
  smartFindOne(req, res);
});

async function smartFindOne(req, res) {
  var query = req.params.q;
  let cleanQ = query.split("?").length > 1 ? query.split("?")[0] : query;
  console.log(cleanQ);
  let queryTries = 0;
  while (queryTries < 3) {
    let halfSliceCharCount = cleanQ.length < 20 ? 4 : 8;
    if (queryTries > 0)
      cleanQ = cleanQ.slice(
        halfSliceCharCount,
        cleanQ.length - halfSliceCharCount
      );
    let question = await findQuestionFromExamCollections(cleanQ).catch(
      (err) => {
        return res.send(err);
      }
    );
    if (question) return res.json(question);
    queryTries++;
  }
  return res.status(404).json({ message: "No question matches the query" });
}

function findQuestionFromExamCollections(cleanQuery) {
  return new Promise((resolve, reject) => {
    examModel.findOne(
      { "questions.title": { $regex: `.*${cleanQuery}.*` } },
      { questions: { $elemMatch: { title: { $regex: `.*${cleanQuery}.*` } } } },
      (err, question) => {
        if (err) {
          console.log("error");
          reject(err);
        } else {
          console.log("question :");
          console.log(question);
          resolve(question);
        }
      }
    );
  });
}

app.get("/all", (req, res) => {
  const query = new RegExp(req.params.q, "i");
  examModel.find({}, (err, question) => {
    if (err) return res.send(err);
    res.status(200);
    res.json(question);
  });
});

var lockPop = false;
app.get("/populate/", (req, res) => {
  lockPop = true;
  populateFullDb();
  return res.send("populating db");y
});

async function populateTheDb(req, res) {
  var scrapper = new Scrapper(req.params.url);
  console.log("######## populating with link " + req.params.url);
  return await scrapper.getExam().then((result) => {
    if (result.questions.length > 0)
      examModel.collection.insertOne(result, (err, result) => {
        if (err) return res.send(err);

        res.send(result);
      });
  });
}

async function populateFullDb() {
  for (var i in examLinks) {
    try {
      var scrapper = new Scrapper(examLinks[i]);
      console.log(`####### ${i} of ${examLinks.length} #######`);
      await scrapper.getExam().then((result) => {
        console.log("Retrieved  " + result.questions.length + " questions");
        console.log(
          "linkstats " + result.questions.length + " " + examLinks[i]
        );

        if (result.questions.length > 0)
          examModel.collection.insertOne(result, (err, result) => {
            if (err)
              console.log(`#######InsertError  ${examLinks[i]} #######`, err);
            console.log(`#######Success ${examLinks[i]} #######`);
          });
      });
    } catch (error) {
      console.log(`#######ExitError  ${examLinks[i]} #######`, error);
    }
  }

  lockPop = false;
}

///////////////////////////////////////////////////////////////////////////

app.get("/loadExamForUpdate/:url?", (req, res) => {
  if (req.params.url) {
    var condition = { pageUrl: req.params.url };
  } else {
    var condition = { version: "" };
  }
  examModel.findOne(condition, "_id pageUrl version name", (err, result) => {
    if (err) return res.status(400).json(err);
    if (!result) return res.status(404).json(result);
    return res.json(result);
  });
});

app.post("/updateExam", (req, res) => {
  examModel.updateOne(
    { _id: req.body.examId },
    { name: req.body.name, version: req.body.version },
    (err, result) => {
      console.log(err, result);

      if (result) return res.json(result);
    }
  );
});

app.get("/metadata", (req, res) => {
  res.sendFile(__dirname + "/metadata.html");
});

const httpsServer = https.createServer({
  key: fs.readFileSync('/etc/letsencrypt/live/eliotmasset.fr/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/eliotmasset.fr/fullchain.pem'),
}, app);

httpsServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
