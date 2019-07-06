
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/ccnaSelectDb', { useNewUrlParser: true });

const Schema = mongoose.Schema;

const examSchema = new Schema({

    name: String,
    version: String,
    pageUrl:  { type: String    },//, unique: true }, 
    questions: [
        {
            title: String,
            questionImage: String,
            identifier: { type: String  }, 
            solution: {
                choices: [
                    {
                        name: String,
                        isAnswer: Boolean,
                    }
                ],
                choiceImages: [
                    {
                        name: String,
                        isAnswer: Boolean,
                    }
                ],
                solutionImage: String,
                htmlSolution: String,
                explanation: String,
            },

        }
    ]
});

const qModel = mongoose.model('exam', examSchema)

module.exports = qModel