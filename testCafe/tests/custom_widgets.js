import {Selector, ClientFunction} from 'testcafe';
const assert = require('assert');
const title = `custom widgets`;

const url = 'http://127.0.0.1:7777/example/customWidget.html';

export const init = ClientFunction(() => {
    Survey.Survey.cssType = "bootstrap";
    Survey.defaultBootstrapCss.navigationButton = "btn btn-green";
    //Add date format property into text question
    Survey.JsonObject.metaData.addProperty("text", {name: "dateFormat", default: "dd/mm/yy"});
    
    //Add properties for Bar Rating
    Survey.JsonObject.metaData.addProperty("dropdown", {name: "renderAs", default: "standard", choices: ["standard", "barrating"]});
    Survey.JsonObject.metaData.addProperty("dropdown", {name: "ratingTheme", default: "fontawesome-stars", choices: ["fontawesome-stars", "css-stars", "bars-pill", "bars-1to10", "bars-movie", "bars-square", "bars-reversed", "bars-horizontal", "bootstrap-stars", "fontawesome-stars-o"]});
    Survey.JsonObject.metaData.addProperty("dropdown", {name: "showValues:boolean", default: false});
    
    //jQuery date picker. It is used for "text" question if inputType equals to 'date'.
    var dateWidget = {
        name: "datepicker",
        htmlTemplate: "<input id='widget-datepicker' type='text'>",
        isFit : function(question) { return question.inputType === 'date'; },
        afterRender: function(question, el) {
    
            var dateFormat = question.dateFormat ? question.dateFormat : "dd/mm/yy";
            var widget = $(el).datepicker({
                dateFormat: dateFormat
            });
            widget.on("change", function (e) {
                question.value = $(this).val();
            });
            question.valueChangedCallback = function() {
                widget.datepicker('setDate', new Date(question.value));
            }
        }
    }
    Survey.CustomWidgetCollection.Instance.addCustomWidget(dateWidget);
    
    //Antennaio jQuery Bar Rating. It is based on "dropdown" question. If renderAs equals to 'barrating' then it is used.
    var barRatingWidget = {
        name: "antennaio-jquery-bar-rating",
        isFit : function(question) { return question["renderAs"] === 'barrating'; },
        isDefaultRender: true,
        afterRender: function(question, el) {
    
            var $el = $(el);
            var ratingTheme = question.ratingTheme ? question.ratingTheme : "fontawesome-stars";
            var showValues = question.showValues ? question.showValues : false; 
            $el.barrating('show', {
                theme: ratingTheme,
                initialRating: question.value,
                showValues: showValues,
                showSelectedRating: false,
                onSelect: function(value, text) {
                    question.value = value;
                }
            });
    
            question.valueChangedCallback = function() {
                $(el).find('select').barrating('set', question.value);
            }
        }
    }
    Survey.CustomWidgetCollection.Instance.addCustomWidget(barRatingWidget);
    
    //select2. All dropdown questions, except Bar Rating, are rendered as select2.
    var select2Widget = {
        name: "select2",
        htmlTemplate: "<select style='width: 100%;'></select>",
        isFit : function(question) { return question.getType() === 'dropdown'; },
        afterRender: function(question, el) {
    
            var $el = $(el);
    
            var widget = $el.select2({
                data: question.choices.map(function(choice) { return { id: choice.value, text: choice.text }; }),
                theme: "classic"
            });
            $el.on('select2:select', function (e) {
                question.value = e.target.value;
            });
            var updateHandler = function() {
                $el.val(question.value).trigger("change");
            };
            question.valueChangedCallback = updateHandler;
            updateHandler();
        }
    }
    Survey.CustomWidgetCollection.Instance.addCustomWidget(select2Widget);
    
    //select2, with multiple set on. All checkbox questions are rendered as multiple select2
    var select2TagBoxWidget = {
        name: "select2tagbox",
        htmlTemplate: "<select multiple='multiple' style='width: 100%;'></select>",
        isFit : function(question) { return question.getType() === 'checkbox'; },
        afterRender: function(question, el) {
    
            var $el = $(el);
    
            var widget = $el.select2({
                tags: "true",
                data: question.choices.map(function(choice) { return { id: choice.value, text: choice.text }; }),
                theme: "classic"
            });
            $el.on('select2:unselect', function (e) {
                var index = (question.value || []).indexOf(e.params.data.id);
                if(index !== -1) {
                    question.value = question.value.splice(index, 1);
                }
            });
            $el.on('select2:select', function (e) {
                question.value = (question.value || []).concat(e.params.data.id);
            });
            var updateHandler = function() {
                $el.val(question.value).trigger("change");
            };
            question.valueChangedCallback = updateHandler;
            updateHandler();
        }
    }
    Survey.CustomWidgetCollection.Instance.addCustomWidget(select2TagBoxWidget);
    
    //iCheck. All radio group questions are rendered as iCheck
    var iCheckWidget = {
        name: "icheck",
        isFit : function(question) { return question.getType() == "radiogroup"; },
        isDefaultRender: true,
        afterRender: function(question, el) {
            var select = function() {
              $(el).find("input[value=" + question.value + "]").iCheck('check');
            }
            $(el).find('input').iCheck({
              checkboxClass: 'iradio_square-blue',
              radioClass: 'iradio_square-blue',
              increaseArea: '20%' // optional
            });
            $(el).find('input').on('ifChecked', function(event){
              question.value = event.target.value;
            });
            question.valueChangedCallback = select;
            select();
        }
    }
    Survey.CustomWidgetCollection.Instance.addCustomWidget(iCheckWidget);
    
    //Hide json tab and allow to drop only three questions
    var editorOptions = {questionTypes : ["text", "radiogroup", "dropdown"], showJSONEditorTab : false};
    var editor = new SurveyEditor.SurveyEditor("editorElement", editorOptions);
    
    //Hide some properties.
    editor.onCanShowProperty.add(function(sender, options){
        if(options.obj.getType() == "dropdown") {
            var forbiddenBarRatingProperties = ["choicesOrder", "choicesByUrl", "optionsCaption", "hasOther"];
            var forbiddenDropDownProperties = ["ratingTheme", "showValues"];
            var isBarRating = options.obj["renderAs"] == "barrating";
            var propName = options.property.name;
            //hide renderAs property
            var canShow = propName != "renderAs";
            //hide properties for standard dropdown
            if(canShow && !isBarRating) canShow =  forbiddenDropDownProperties.indexOf(propName) < 0;
            //hide properties for Bar Rating
            if(canShow && isBarRating) canShow =  forbiddenBarRatingProperties.indexOf(propName) < 0;
            options.canShow = canShow;
        }
    });
    
    //Add Bar Rating question into Toolbox
    editor.toolbox.addItem({
            name: "barrating",
            iconName: "icon-rating",
            title: "Bar Rating",
            json: { "type": "dropdown",  "renderAs": "barrating", "choices": [1, 2, 3, 4, 5] } 
    });
    
    //Add Multiple Select question into Toolbox
    editor.toolbox.addItem({
            name: "multiple",
            iconName: "icon-checkbox",
            title: "Multiple Selector",
            json: { "type": "checkbox",  "choices": [1, 2, 3] } 
    });

    window.editor = editor;
});

fixture `surveyjseditor: ${title}`

    .page `${url}`

    .beforeEach( async ctx => {
        await init();
    });

    test(`check widgets`, async t => {
        const getTestTab = Selector(() =>
            document.querySelectorAll(".svd_container ul li:nth-child(3)")[0]);

        await t
            .click(`[title~=Radiogroup]`)
            .click(`[title~=Dropdown]`)
            .click(`[title~=Rating]`)
            .click(`[title~=Multiple]`)
            .click(getTestTab)
            .wait(1000)
            .click(`#surveyjsExample .iradio_square-blue`)
            .click(`#surveyjsExample .select2-container`)
            .click(`#surveyjsExample .br-theme-fontawesome-stars a`);
    });