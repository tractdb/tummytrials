// Proposed data structure for consumption by the vis:
// "symptoms": [{
//     "symptom": name of symptom,
//     "date": readable date,
//     "condition": A/B + text,
//     "severity": num/missing
//     "compliance": yes/no
// }, ...
// ]
// on second thought, use severity to overload compliance. 
// if, complied, then a positive number, else -2, if complied and no score, -1
// if compliance is true, but no score reported, does that mean no compliance?
// "symptoms": [{
//     "symptom": name of symptom,
//          "date": [condition, score]    
// }, ...
// ]

// Things needed for the results summary
// Evidence : categorization of p-value into no evidence, possible evidence, or strong evidence
// Symptom : name of the symptom (results are divided per symptom)
// Change : does it improve or worsen the symptom
// Trigger : name of trigger (common across symptoms)

'use strict';

(angular.module('tummytrials.pasttrial1ctrl', 
                ['tummytrials.text', 'ionic', 'tummytrials.experiments', 
                 'd3', 'tummytrials.vis', 'd3.directives', 
                 'tummytrials.studyfmt','tummytrials.currentctrl', 'tummytrials.lc'])

.controller('PastTrial1Ctrl', function($scope, $stateParams, $ionicPopup, $timeout, Vis,
                                        Text, Experiments, LC, d3Service, $window) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var study = $scope.study_previous[$stateParams.studyIndex];
        var text = $scope.text;
        $scope.study_past1 = study;

        // check if result is ready
        var ready = null; 
        if(!study.results){
            ready = false;
        } else {
            ready = true;
        }
        $scope.ready = ready;


        // variables for displaying test in the results
        $scope.start_date_md = LC.datemd(new Date(study.start_time * 1000));

        var end_date = new Date(study.end_time * 1000); // This is first day *after* the trial
        end_date.setDate(end_date.getDate() - 1); // This is last day of the trial
        $scope.end_date_md = LC.datemd(end_date);     

        $scope.st_trigger = study.trigger;
        $scope.st_symptom = study.symptoms;
        $scope.st_status = study.status;
        $scope.st_comment = study.comment;


        // injecting Vis service
        $scope.visdata = Vis;
        //gather all data needed for report + vis 
        var cur = study;
        $scope.exp_id = cur.id;
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


                    if(cur.reports[i] == null) {
                        sym_data["severity"] = 0;
                        if(rand[i] == "A"){
                            a_void = a_void + 1;
                        }
                        if(rand[i] == "B"){
                            b_void = b_void + 1;
                        }
                    } else if(typeof(cur.reports[i]) == "object"){
                        //report logged if there is an object and symptom scores exists
                        if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) == "object"){
                            score = cur.reports[i].symptom_scores[a].score;
                            // off setting the symptom score by 2 for the result vis.
                            sym_data["severity"] = score + 2;
                            if(rand[i] == "A"){
                                a_avg = a_avg + score;
                            }
                            if(rand[i] == "B"){
                                b_avg = b_avg + score;
                            } 
                        // if compliance is true but score not reported
                        } else if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) != "object"){
                            sym_data["severity"] = 1;
                            if(rand[i] == "A"){
                                a_void = a_void + 1;
                            }
                            if(rand[i] == "B"){
                                b_void = b_void + 1;
                            } 
                        // negative compliance
                        } else {
                            // print no compliance
                            sym_data["severity"] = 0;
                            if(rand[i] == "A"){
                                a_void = a_void + 1;
                            }
                            if(rand[i] == "B"){
                                b_void = b_void + 1;
                            }
                        }
                    // no response at all
                    } else {
                        sym_data["severity"] = 0;
                        if(rand[i] == "A"){
                            a_void = a_void + 1;
                        }
                        if(rand[i] == "B"){
                            b_void = b_void + 1;
                        }
                    }

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

                    res_desc = res_desc.replace('{SYMPTOM}', sym_name);
                    res_desc = res_desc.replace('{TRIGGER}', trig);
                    if(p_val[a]){
                        var p_val_num = Number(p_val[a]);
                        if(p_val_num <= 0.05){
                            res_desc = res_desc.replace('{EVIDENCE}', 'strong');
                        } else if(p_val_num > 0.05 && p_val_num <= 0.1) {
                            res_desc = res_desc.replace('{EVIDENCE}', 'possible');
                        } else if(p_val_num > 0.1){
                            res_desc = res_desc.replace('{EVIDENCE}', 'no');
                        }

                    }
                    sym_data["summary"] = res_desc;
                    sym_data["a_avg"] = a_avg;
                    sym_data["b_avg"] = b_avg;
                    sym_data["a_void"] = a_void;
                    sym_data["b_void"] = b_void;
                    sym_data["p_val"] = p_val[a];


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
                res_desc = sym_sym[0]["summary"];
                
                if(a_avg > b_avg){
                    res_desc = res_desc.replace('{BETTER/WORSE}', 'worse');
                } else if(a_avg < b_avg){
                    res_desc = res_desc.replace('{BETTER/WORSE}', 'better');
                } else if(a_avg = b_avg){
                    res_desc = res_desc.replace('gets {BETTER/WORSE}', 'stays the same ');
                } 
                sym_sym[0]["summary"] = res_desc;


                // console.log("A " + a_avg + " B " + b_avg);
                // 0 - 6
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

        // onclick function for the visualization
        $scope.d3OnClick = function(data_pt){

            var cond_text = null;
                if(data_pt.condition == 0){
                    cond_text = A_text;
                }
                if(data_pt.condition == 1){
                    cond_text = B_text;
                }

            var severity_text = null;
               var mapper = {
                  0 : "Negative compliance",
                  1 : "Missing data",
                  2 : "Not at all",
                  3 : "Slightly",        
                  4 : "Mildly",
                  5 : "Moderately",
                  6 : "Severely",
                  7 : "Very severely",
                  8 : "Extremely"
                };
            severity_text = mapper[data_pt.severity];

            //trimming date to be more readable
            var date_trimmed = JSON.stringify(data_pt.date);
            date_trimmed = date_trimmed.replace('T08:00:00.000Z', '');
            date_trimmed = date_trimmed.replace(/"/g, '');

            $scope.alert_message = "Condition : " + cond_text + "<br/>" + "Severity : " + severity_text + "<br/>" + 
                          "Date : " + date_trimmed;

            $scope.alert_title = "Details for the day"

               var alertPopup = $ionicPopup.alert({
                 title: $scope.alert_title,
                 template: $scope.alert_message
               });

               alertPopup.then(function(res) {
               });
             // };
        //end onClick
        };

        $scope.resultVisControl = {};

    });
})
// module end
);