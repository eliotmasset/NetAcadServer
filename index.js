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
const express = require('express')
const app = express()
const Scrapper = require('./Scrapper')
const examModel = require('./examModel')
const examLinks = require("./allExamLinks")


app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get("/pop/:url", (req, res) => {
    console.log(req.params.url)
    populateTheDb(req, res)


})

app.get("/q/:q", (req, res) => {

    smartFindOne(req, res)

})

function smartFindOne(req, res) {


    var query = req.params.q
    var cleanQ = "________"
    try {
        cleanQ = query.split("?")[0]
    } catch (error) {
        cleanQ = query
    }

    console.log("q")
    examModel.findOne({ "questions.title": { $regex: '.*' + cleanQ + '.*' } },
        { questions: { $elemMatch: { title: { $regex: '.*' + cleanQ + '.*' } } } },
        (err, question) => {
            if (err)
                return res.send(err)

            if (!question) {
                try {
                    cleanQ = query.split("").splice(8).join("")
                } catch (error) {

                }
                return examModel.findOne({ "questions.title": { $regex: '.*' + cleanQ + '.*' } },
                    { questions: { $elemMatch: { title: { $regex: '.*' + cleanQ + '.*' } } } },
                    (err, question) => {
                        res.status(200)
                        return res.json(question)
                    })


            } else {
                res.status(200)
                return res.json(question)
            }


        })
}
app.get("/all", (req, res) => {
    const query = new RegExp(req.params.q, 'i')
    examModel.find({}, (err, question) => {
        if (err)
            return res.send(err)
        res.status(200)
        res.json(question)



    })
})


async function populateTheDb(req, res) {
    var scrapper = new Scrapper(req.params.url)
    console.log("######## populating with link " + req.params.url)
    return await scrapper.getExam().then(result => {

        if (result.questions.length > 0)
            examModel.collection.insertOne(result, (err, result) => {

                if (err)
                    return res.send(err)

                res.send(result)

            })
    })
}

var lockPop = false
app.get("/populate/:pin", (req, res) => {

    if (req.params.pin == "some-fake-pin" && !lockPop) {
        lockPop = true
        populateFullDb()
        res.send("populating db")
    }
    else if (lockPop) {
        res.send("Pupulating db in process. Locked! ")
    } else {
        res.send("INCORRECT PIN")
    }

})

async function populateFullDb() {
    for (var i in examLinks) {
        try {
            var scrapper = new Scrapper(examLinks[i])
            console.log("############# " + i + " of " + examLinks.length + " ################")

            await scrapper.getQuestions().then(results => {
                console.log("---> Questions retrieved: " + results.length)
                var cleanResults = []
                for (var j in results) {
                    if (results[j].title) {

                        results[j].identifier = results[j].title.replace(/\ /g, "")

                        cleanResults.push(results[j])
                    }

                }
                if (cleanResults.length > 0)
                    examModel.collection.insertMany(cleanResults, (err, result) => {

                        if (err)
                            return console.log("---> " + examLinks[i] + " failed", err)

                        console.log("---> " + (examLinks[i]) + " successful")

                    })
                else {
                    console.log("Got no questions for: ", examLinks[i])
                }

            })
        } catch (error) {
            console.log("EXIT ERROR *** " + examLinks[i])
        }

    }

    lockPop = false

}

app.listen(3000)
console.log("sitati") 