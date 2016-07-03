// Current data scructure being passed for the result + result vis
// Values are for example purpose
// {
//     "index":1,
//     "condition":0,
//     "note":"No note.",
//     "severity":5,
//     "real_severity":5,
//     "bcomp":true,
//     "lcomp":true,
//     "date":"Tue, Apr 26 2016",
//     "summary":"Based on the trial, there is strong evidence that your Abdominal Pain gets worse when you consume Caffeine",
//     "a_avg":3,
//     "b_avg":0,
//     "a_void":0,
//     "b_void":0,
//     "p_val":"0.045",
//     "a_void_flag":false,
//     "b_void_flag":false,
//     "trigger":"Caffeine",
//     "a_res_text":"Moderately",
//     "b_res_text":"Mildly"
// }


// Things needed for the results summary
// Evidence : categorization of p-value into no evidence, possible evidence, or strong evidence
// Symptom : name of the symptom (results are divided per symptom)
// Change : does it improve or worsen the symptom
// Trigger : name of trigger (common across symptoms)

'use strict';

(angular.module('tummytrials.pasttrial1ctrl', 
                ['tummytrials.text', 'ionic', 'tummytrials.experiments', 
                 'd3', 'tummytrials.vis', 'd3.directives', 'tummytrials.neg_comp_data',
                 'tummytrials.studyfmt','tummytrials.currentctrl', 'tummytrials.lc'])

.controller('PastTrial1Ctrl', function($scope, $stateParams, $ionicPopup, $timeout, Vis,
                                        Text, Experiments, LC, d3Service, $window, Neg_Comp_Data) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var study = $scope.study_previous[$stateParams.studyIndex];
        var text = $scope.text;
        $scope.study_past1 = study;
        $scope.neg_comp_d = Neg_Comp_Data;

        // check if result is ready
        var ready = null; 
        if(!study.results){
            ready = false;
        } else {
            ready = true;
        }
        $scope.ready = ready;

        // button toggles
        $scope.timeline_h = false;
        $scope.trend_h = true;


        // variables for displaying test in the results
        $scope.start_date_md = LC.datemd(new Date(study.start_time * 1000));

        var end_date = new Date(study.end_time * 1000); // This is first day *after* the trial
        end_date.setDate(end_date.getDate() - 1); // This is last day of the trial
        $scope.end_date_md = LC.datemd(end_date);     

        $scope.view_title = study.trigger;
        $scope.st_trigger = study.trigger;
        Neg_Comp_Data.trigger = study.trigger;
        $scope.st_symptom = study.symptoms;
        $scope.st_status = study.status;
        $scope.st_comment = study.comment; // Free form comment (unused)
        $scope.st_reason = study.reason;   // Reason for abandoning trial


        // injecting Vis service
        $scope.visdata = Vis;
        //gather all data needed for report + vis 
        var cur = study;
        console.log("Viewing result of trial: " + cur.id);
        $scope.nm = name;

        //Get the duration of the experiment
        var dur = cur.end_time - cur.start_time;
        $scope.duration = new Date(dur * 1000); 
        $scope.duration_readable = LC.dateonly($scope.duration);

        var report = [];
        var days = []; // Array for filling the calendar widget 
        var d = []; // Temp array 
        var rand = cur.abstring.split(''); // Array for the randomization of conditions
        var score = null;
        var sym_num = cur.symptoms.length; // number of symptoms being logged
        var sym_name = null;
        var sym_sym = [];
        var sym_data = {};
        var res_all = {};

        //Statement summary of the result
        var res_desc = text.results.summary;
        var trig = cur.trigger;
        var p_val = cur.results;
        var a_avg = 0, a_void = 0, a_void_flag, a_res_text,
             b_avg = 0, b_void = 0, b_void_flag, b_res_text;

        // checking if trigger has Eating or Drinking in its text
        // 'Drinking Caffeine' becomes 'Caffeine'
        if(trig.indexOf('Eating') != -1){
            trig = trig.replace('Eating ', '');
        } else if(trig.indexOf('Drinking') != -1){
            trig = trig.replace('Drinking ', '');
        }
        $scope.trig = trig;


        // iterating over all the symptoms
        for(var a = 0; a < sym_num; a++){
            sym_name = cur.symptoms[a];
                // iterating over all the days of the trial
                for(var i=0; i < $scope.duration_readable; i++){
                    var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                    var dt = LC.fulldate(day);
                    var score = null;
                    // d.push(dt);
                    d.push(rand[i]);
                    sym_data["index"] = (i+1);
                    if(rand[i] == "A"){
                        sym_data["condition"] = 0;
                    } 
                    if(rand[i] == "B"){
                        sym_data["condition"] = 1;
                    } 

                    // Adding the note for the day to the data struct
                    if(cur.reports[i] == null){
                        sym_data["note"] = 'No note';
                        sym_data["bcomp"] = "No report";
                        sym_data["lcomp"] = "No report";
                        sym_data["severity"] = 1;
                        sym_data["real_severity"] = 1;
                        if(rand[i] == "A"){
                            a_void = a_void + 1;
                        }
                        if(rand[i] == "B"){
                            b_void = b_void + 1;
                        }
                    }
                    else {
                        if(cur.reports[i].hasOwnProperty('note')){
                            sym_data["note"] = cur.reports[i].note;
                        } else {
                            sym_data["note"] = 'No note';
                        }

                    // } 

                    // for any missing or negative compliance days a_void/b_void are incremented
                    // for calculating the average for each condition
                    // take total of symptom severity (without +2 offset) and divide by num of days - void days

                        if(typeof(cur.reports[i]) == "object"){
                            // // no report
                            // if(cur.reports[i] == null) {
                            //     sym_data["severity"] = 1;
                            //     sym_data["real_severity"] = 1;
                            //     if(rand[i] == "A"){
                            //         a_void = a_void + 1;
                            //     }
                            //     if(rand[i] == "B"){
                            //         b_void = b_void + 1;
                            //     }
                            // } 

                            // real_severity is the measure being used for popup.
                            // severity is the measure being used for visualization.
                            if(typeof(cur.reports[i].symptom_scores) == "object"){
                                if(cur.reports[i].breakfast_compliance == true && cur.reports[i].lunch_compliance == true){
                                    // both compliances are true and symptom score exists. valid score.
                                    score = cur.reports[i].symptom_scores[a].score;
                                    // offsetting the symptom score by 2 for the result vis.
                                    sym_data["severity"] = score + 2;
                                    sym_data["real_severity"] = score + 2;
                                    if(rand[i] == "A"){
                                        a_avg = a_avg + score;
                                    }
                                    if(rand[i] == "B"){
                                        b_avg = b_avg + score;
                                    }                                 
                                } else {
                                    // either compliance is false
                                    score = cur.reports[i].symptom_scores[a].score;
                                    sym_data["severity"] = 0;
                                    sym_data["real_severity"] = score + 2;
                                    if(rand[i] == "A"){
                                        a_void = a_void + 1;
                                    }
                                    if(rand[i] == "B"){
                                        b_void = b_void + 1;
                                    }
                                }
                            } else {
                                // symptom score not reported
                                sym_data["severity"] = 1;
                                sym_data["real_severity"] = 1;
                                if(rand[i] == "A"){
                                    a_void = a_void + 1;
                                }
                                if(rand[i] == "B"){
                                    b_void = b_void + 1;
                                } 
                            }
                        }
                        sym_data["bcomp"] = cur.reports[i].breakfast_compliance;
                        sym_data["lcomp"] = cur.reports[i].lunch_compliance;
                    }

                    // set void flag true for void days > 0
                    // void flag is used to toggle text alerting user about misleading averages
                    if(a_void > 0){
                        a_void_flag = true;
                    } else {
                        a_void_flag = false;
                    }
                    if(b_void > 0){
                        b_void_flag = true;
                    } else {
                        b_void_flag = false;
                    }

                    // Using the date as the key, store the condition and the score for each day
                    sym_data["date"] = dt;

                    var p_txt;
                    res_desc = res_desc.replace('{SYMPTOM}', sym_name);
                    res_desc = res_desc.replace('{TRIGGER}', trig);
                    if(p_val[a]){
                        var p_val_num = Number(p_val[a]);
                        if(p_val_num <= 0.05){
                            res_desc = res_desc.replace('{EVIDENCE}', 'strong');
                            p_txt = "Strong evidence";
                        } else if(p_val_num > 0.05 && p_val_num <= 0.15) {
                            res_desc = res_desc.replace('{EVIDENCE}', 'possible');
                            p_txt = "Possible evidence";
                        } else if(p_val_num > 0.15 && p_val_num <= 0.35){
                            res_desc = res_desc.replace('{EVIDENCE}', 'weak');
                            p_txt = "Weak evidence";
                        } else if(p_val_num > 0.35){
                            res_desc = res_desc.replace('{EVIDENCE}', 'no');
                            p_txt = "No evidence";
                        }

                    }
                    sym_data["summary"] = res_desc;
                    sym_data["p_txt"] = p_txt;
                    sym_data["a_avg"] = a_avg;
                    sym_data["b_avg"] = b_avg;
                    sym_data["a_void"] = a_void;
                    sym_data["b_void"] = b_void;
                    sym_data["p_val"] = p_val[a];
                    sym_data["a_void_flag"] = a_void_flag;
                    sym_data["b_void_flag"] = b_void_flag;
                    sym_data["trigger"] = trig;

                    sym_sym.push(sym_data);
                    d = [];
                    score = null;
                    sym_data = {};
                    // need to reset the description text since {SYMPTOM} no longer exists after first pass
                    res_desc = text.results.summary;
                }

                a_avg = a_avg / [($scope.duration_readable / 2) - a_void];
                b_avg = b_avg / [($scope.duration_readable / 2) - b_void];

                //Condition A is on trigger and B is off trigger
                // res_desc = sym_sym[0]["summary"];
                
                // if(a_avg > b_avg){
                //     res_desc = res_desc.replace('{BETTER/WORSE}', 'worse');
                // } else if(a_avg < b_avg){
                //     res_desc = res_desc.replace('gets {BETTER/WORSE}', 'does not worsen');
                // } else if(a_avg == b_avg){
                //     res_desc = res_desc.replace('gets {BETTER/WORSE}', 'stays the same ');
                // } 
                // sym_sym[0]["summary"] = res_desc;


                // Converting average values to text labels
                // x +/- 0.2 is x
                // between x.2 and x.8 is x.5
                // since score was not offset, score value ranges from 0 to 6
                if(a_avg <= 0.2){
                    a_res_text = "Not at all";
                } else if (a_avg > 0.2 && a_avg < 0.8){
                    a_res_text = "between Not at all and Slightly";
                } else if (a_avg >= 0.8 && a_avg <= 1.2){
                    a_res_text = "Slightly";
                } else if (a_avg > 1.2 && a_avg < 1.8){
                    a_res_text = "between Slightly and Mildly";
                } else if (a_avg >= 1.8 && a_avg <= 2.2){
                    a_res_text = "Mildly";
                } else if (a_avg > 2.2 && a_avg < 2.8){
                    a_res_text = "between Mildly and Moderately";
                } else if (a_avg >= 2.8 && a_avg <= 3.2){
                    a_res_text = "Moderately";
                } else if (a_avg > 3.2 && a_avg < 3.8){
                    a_res_text = "between Moderately and Severely";
                } else if (a_avg >= 3.8 && a_avg <= 4.2){
                    a_res_text = "Severely";
                } else if (a_avg > 4.2 && a_avg < 4.8){
                    a_res_text = "between Severely and Very Severely";
                } else if (a_avg >= 4.8 && a_avg <= 5.2){
                    a_res_text = "Very Severely";
                } else if (a_avg > 5.2 && a_avg < 5.8){
                    a_res_text = "between Very Severely and Extremely";
                } else if (a_avg >= 5.8){
                    a_res_text = "Extremely";
                } 

                if(b_avg <= 0.2){
                    b_res_text = "Not at all";
                } else if (b_avg > 0.2 && b_avg < 0.8){
                    b_res_text = "between Not at all and Slightly";
                } else if (b_avg >= 0.8 && b_avg <= 1.2){
                    b_res_text = "Slightly";
                } else if (b_avg > 1.2 && b_avg < 1.8){
                    b_res_text = "between Slightly and Mildly";
                } else if (b_avg >= 1.8 && b_avg <= 2.2){
                    b_res_text = "Mildly";
                } else if (b_avg > 2.2 && b_avg < 2.8){
                    b_res_text = "between Mildly and Moderately";
                } else if (b_avg >= 2.8 && b_avg <= 3.2){
                    b_res_text = "Moderately";
                } else if (b_avg > 3.2 && b_avg < 3.8){
                    b_res_text = "between Moderately and Severely";
                } else if (b_avg >= 3.8 && b_avg <= 4.2){
                    b_res_text = "Severely";
                } else if (b_avg > 4.2 && b_avg < 4.8){
                    b_res_text = "between Severely and Very Severely";
                } else if (b_avg >= 4.8 && b_avg <= 5.2){
                    b_res_text = "Very Severely";
                } else if (b_avg > 5.2 && b_avg < 5.8){
                    b_res_text = "between Very Severely and Extremely";
                } else if (b_avg >= 5.8){
                    b_res_text = "Extremely";
                } 
                sym_sym[0]["a_res_text"] = a_res_text;
                sym_sym[0]["b_res_text"] = b_res_text;
                $scope.sym_syma = sym_sym;
                res_all[sym_name] = sym_sym; 
                sym_sym = [];
                a_avg = 0; b_avg = 0; a_void = 0; b_void = 0;

        }
        $scope.visdata = res_all;

        $scope.$watch(Vis.view_title, function(newVal, oldVal, scope){
            if(newVal){
                scope.view_title = newVal;
            }
        })
        
        //Figuring out the message for the day (avoid/consume the trigger)
            var A_text, B_text, h_URL;
            var text_loc = $scope.text.setup3.triggers; //Getting the text from JSON for each trigger

            for(i = 0; i < text_loc.length; i ++){
                if(cur.trigger == text_loc[i].trigger){ //Checking which trigger is being tested in the current experiment                    
                    A_text = text_loc[i].phrase_plus;
                    B_text = text_loc[i].phrase_minus;
                    h_URL = text_loc[i].uisref; // URL for help deciding what to eat for the condition
                }
            }
            $scope.A_text = A_text;
            $scope.B_text = B_text;
            $scope.help_URL = h_URL;

            Vis.A_text = A_text;
            Vis.B_text = B_text;

            console.log("neg comp " + Neg_Comp_Data.trigger);

        // onclick function for the visualization
        $scope.d3OnClick = function(data_pt){

            var cond_text;
                if(data_pt.condition == 0){
                    cond_text = A_text;
                }
                if(data_pt.condition == 1){
                    cond_text = B_text;
                }

            var severity_text = null;
               var mapper = {
                  0 : "Negative Compliance",
                  1 : "No Report",
                  2 : "Not At All",
                  3 : "Slight",        
                  4 : "Mild",
                  5 : "Moderate",
                  6 : "Severe",
                  7 : "Very Severe",
                  8 : "Extreme"
                };
            severity_text = mapper[data_pt.real_severity];

            var nt = data_pt.note;
            var bcomp = data_pt.bcomp;
            if(bcomp == true){bcomp = "Did "}else if(bcomp == false){bcomp="<span class='assertive heavy'>Did not "}
            var lcomp = data_pt.lcomp;
            if(lcomp == true){lcomp = "Did Fast"}else if(lcomp == false){lcomp="<span class='assertive heavy'>Did not Fast</span>"}

            //trimming date to be more readable
            // var date_trimmed = JSON.stringify(data_pt.date);
            var date_trimmed = data_pt.date + ''; // convert to string for replace function
            // date looks like: Mon Jun 06 2016 00:00:00 GMT-0700 (PDT)
            date_trimmed = date_trimmed.replace(' 2016 00:00:00 GMT-0700 (PDT)', '');
            // date_trimmed = date_trimmed.replace(/"/g, '');




            // Remove compliances if no report was submitted for the day
            if(severity_text == "No report"){
                $scope.alert_message =  "Date : " + date_trimmed + "<br/>" + 
                                    "Condition : " + cond_text + "<br/>" +
                                    "Symptom Level : " + severity_text + "<br/>" + 
                                    "Note : " + nt + "<br/>";
            } else {
                $scope.alert_message =  "Date : " + date_trimmed + "<br/>" + 
                                    "Condition : " + cond_text + "<br/>" +
                                    "Breakfast : " + bcomp + cond_text + "</span><br/>" + 
                                    "Fast : " + lcomp + "<br/>" +
                                    "Symptom Impact : " + severity_text + "<br/>" + 
                                    "Note : " + nt + "<br/>";
            }

            $scope.alert_title = "Details for the day"

               var alertPopup = $ionicPopup.alert({
                 title: $scope.alert_title,
                 template: $scope.alert_message,
                 buttons: [{ text: 'Ok', 
                            type: 'button-energized'}]
                });

               alertPopup.then(function(res) {
               });
             // };
        //end onClick
        };

        $scope.resultVisControl = {};

    });
})

.controller('Neg_CompCtrl', function($scope, Neg_Comp_Data){   
    $scope.trigger = Neg_Comp_Data.trigger;
    console.log("neg comp " + Neg_Comp_Data);
})
// module end
);
