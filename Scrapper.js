/**
 *
 *
 *
 * Welcome to the official Scrapper class
 *
 * Author: Aimuhire
 *
 * Details: Because all answer pages are not formatted alike. We use strategies aka: selectors.
 * We basically try one selector, if it returns a null or unusable object... we try selector NUMBER TWO.
 * Until it get to work (|| !=)
 *  */

const cheerio = require("cheerio");
var request = require("request");

class Scrapper {
  constructor(URL) {
    this.pageUrl = URL;

    this.titleSelectors = ["h3", 'div[class="ai-stem"]>strong', "strong"];
    this.questionsSelectors = [
      'ol[class="wpProQuiz_list"] > li',
      "div.entry-content > ol > li",
    ];
    this.choicesSelectors = [
      "img[class='lazyloaded']",
      'li[class="wpProQuiz_questionListItem"]',
      "ul > li",
    ]
  }

  async getExam() {
    var pageStr = await this.getPageString().then((result) => {
      return result;
    });

    const $ = cheerio.load(pageStr);
    var exam = {};
    exam.questions = [];

    exam.name = this.prettifyString($("div.entry-content > h2").text());
    exam.pageUrl = this.pageUrl;
    exam.version = "";

    //loops through the questions list
    var questionsEl = this.getElement($, this.questionsSelectors, $("body"));
    if (questionsEl)
      questionsEl.each((questionIndex, questionEl) => {
        var question = {};

        try {
          var titleEl = this.getElement($, this.titleSelectors, questionEl);
          if (titleEl) var title = titleEl.text();
          try {
            var title = titleEl.text().split("Explanation:")[0];
          } catch (error) {
            console.log(error);
          }
        } catch (error) {
          console.log(error);
        }

        question.title = this.prettifyString(title);
        var solutionResult = this.getSolution($, questionEl);
        if(solutionResult.src != undefined && solutionResult.src != "" && solutionResult.src != null){
          question.src = solutionResult.src;
        }
        if (solutionResult.state === "CHOICES") {
          question.solution = {
            choices: solutionResult.choices,
            explanation: solutionResult.explanation,
          };
        } else if (solutionResult.state === "HTML_SOLUTION") {
          question.htmlSolution = solutionResult.htmlSolution;
        } else {
          question.solution = solutionResult;
        }

        if (!question.title) {
          console.log("question has no title: ", this.pageUrl);
          return;
        }
        question.identifier = question.title.replace(/\ /g, "");

        exam.questions.push(question);
      });
    return exam;
  }
  getPageString() {
    return new Promise((resolve, reject) => {
      request(this.pageUrl, function (error, response, body) {
        if (error) reject(error);

        resolve(body);
      });
    });
  }
  getSolution($, questionEl) {
    var solution = { choices: [] };
    var hasAnswer = false;
    var choicesResult = this.getChoicesElement(
      $,
      this.choicesSelectors,
      questionEl
    );
    if (choicesResult.state === "CHOICES_ELEMENT") {
      var choicesEl = choicesResult.element;
      solution.state = "CHOICES";
    } else {
      solution.state = "HTML_SOLUTION";
      solution.htmlSolution = choicesResult.htmlSolution;
      hasAnswer = true;
      return solution;
    }

    let hasImage = false;
    if (choicesEl)
      choicesEl.each((choiceIndex, choiceEl) => {
        var choice = {};
        var cleanChoice = "";
        //try catch hell?
        console.log($(choiceEl));
        console.log($(choiceEl).prop("tagName"));
        if($(choiceEl).prop("tagName")!="IMG") {
          try {
            cleanChoice = this.prettifyString($(choiceEl).text());
            try {
              cleanChoice = this.prettifyString($(choiceEl).text()).split(
                "Explanation:"
              )[0];
              var expl =
                $('div[class="itemfeedback"]', choiceEl).text() ||
                this.prettifyString($(choiceEl).text()).split("explanation")[1];
            } catch (error) {
              console.log("hi yaaaa", error);
            }
            if (expl) solution.explanation = this.prettifyString(expl);
          } catch (error) {
            console.log("Error cleaning answer...", error);
            cleanChoice = $(choiceEl).text();
          }

          choice.name = cleanChoice;
          if ($('span[style*="color"]', choiceEl).text()) {
            hasAnswer = true;
            choice.isAnswer = true;
            solution.choices.push(choice);
          } else {
            choice.isAnswer = false;
            solution.choices.push(choice);
          }
        } else {
          solution.src = element.attr('src');
        }
      });
    if (hasAnswer) return solution;
    else
      console.log(
        "Question has no answer: ",
        this.pageUrl,
        JSON.stringify(solution)
      );
    return {};
  }

  prettifyString(input) {
    var output = "";
    try {
      output = input.replace(/[\r\n( )]+/g, " ").trim();
      output = input.replace(/Question\sID\s\d+/g, "");
    } catch (error) {}
    return output;
  }

  getElement($, selectors, root) {
    var element = null;
    for (var i = 0; i < selectors.length; i++) {
      element = $(selectors[i], root);

      if (element && element.length > 0) {
        return element;
      }
    }

    if (element) {
      console.info("Selector could not find element: ", selectors, element);
    }
  }

  getChoicesElement($, selectors, root) {
    var element = null;
    var result = {};
    console.log("la");
    for (var i = 0; i < selectors.length; i++) {
      element = $(selectors[i], root);
      console.log(element);

      if (element && element.length > 0) {
        if(element.prop("tagName")=="IMG"){
          result.src = element.attr('src');
          break;
        }
        result.state = "CHOICES_ELEMENT";
        result.element = element;
        return result;
      }
    }

    result.state = "HTML_SOLUTION";
    result.htmlSolution = $(root).html();

    return result;
  }
}

module.exports = Scrapper;
