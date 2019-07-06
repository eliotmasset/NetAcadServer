
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/ccnaSelectDb', { useNewUrlParser: true });

const Schema = mongoose.Schema;

const questionSchema = new Schema({
    title: String,  
    questionImage: String,
    identifier:{type:String,unique:true},
    pageUrl: String,
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
        solutionImage:String,
        explanation:String,
    },
    exam: String,
    version: String,
});

const qModel = mongoose.model('ModelName', questionSchema)

module.exports = qModel