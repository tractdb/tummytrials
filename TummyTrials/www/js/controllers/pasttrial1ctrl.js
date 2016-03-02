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

'use strict';

(angular.module('tummytrials.pasttrial1ctrl', 
                ['tummytrials.text', 'tummytrials.experiments', 'd3.directives', 'd3',
                 'tummytrials.studyfmt','tummytrials.currentctrl', 'tummytrials.lc'])

.controller('PastTrial1Ctrl', function($scope, $stateParams, $cordovaDialogs,
                                        Text, Experiments, StudyFmt, LC, d3Service, $window) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var study = $scope.study_previous[$stateParams.studyIndex];
        $scope.study_past1 = study;

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

        // iterating over all the symptoms
        for(var a = 0; a < sym_num; a++){

            // iterating over all the days of the trial
            for(i=0; i < $scope.duration_readable; i++){

                // iterating over all the days of the trial
                for(var i=0; i < $scope.duration_readable; i++){
                    var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                    var dt = LC.dateonly(day);
                    var score = null;
                    // d.push(dt);
                    d.push(rand[i]);
                    sym_data["index"] = (i+1);
                    sym_data["condition"] = rand[i];

                    if(typeof(cur.reports[i]) == "object"){
                        //report logged if there is an object and symptom scores exists
                        if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) == "object"){
                            score = cur.reports[i].symptom_scores[a].score;
                            sym_data["severity"] = score;
                        // if compliance is true but score not reported
                        } else if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) != "object"){
                            sym_data["severity"] = -1;
                        // negative compliance
                        } else {
                            // print no compliance
                            sym_data["severity"] = -2;
                        }
                    // no response at all
                    } else {
                        sym_data["severity"] = -2;
                    }
                    // Using the date as the key, store the condition and the score for each day
                    sym_data["date"] = dt;
                    sym_sym.push(sym_data);
                    d = [];
                    score = null;
                    sym_data = {};
                }
                $scope.sym_syma = sym_sym;
            }
            res_all[cur.symptoms[a]] = sym_sym; 
            sym_sym = [];
        }
        $scope.visdata = res_all;

        $scope.d3OnClick = function(data_pt){
            console.log("data_pt severity: " + data_pt.severity);
 
            $cordovaDialogs.alert(data_pt.severity, 'Name', 'Dismiss')
                .then(function() {
                // callback success
                });
        };


    });
})
// module end
);