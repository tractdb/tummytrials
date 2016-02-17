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


var app = angular.module('tummytrials.pasttrial1ctrl',
                ['tummytrials.text', 'tummytrials.experiments', 'd3.directives', 'd3',
                 'tummytrials.studyfmt','tummytrials.currentctrl', 'tummytrials.lc']);

app.controller('PastTrial1Ctrl', function($scope, $stateParams,
                                        Text, Experiments, StudyFmt, LC) {
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
        var sym_sym = {};
        var sym_data = {};


        // iterating over all the symptoms
        for(var a = 0; a < sym_num; a++){

            // iterating over all the days of the trial
            for(i=0; i < $scope.duration_readable; i++){

                var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                var dt = LC.dateonly(day);
                var score = null;
                // d.push(dt);
                d.push(rand[i]);

                if(typeof(cur.reports[i]) == "object"){
                    //report logged if there is an object
                    if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) == "object"){
                        //symptoms exist if compliance is true
                        score = cur.reports[i].symptom_scores[a].score;
                        d.push(score);
                    // if compliance is true but score not yet reported
                    } else if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) != "object"){

                    } else {
                        // print no compliance
                        d.push(-2);
                    }
                } else {
                    //print no report 
                    d.push(-1);
                }
                // Using the date as the key, store the condition and the score for each day
                sym_data[dt] = d; // d is condition, score
                d = [];
                score = null;
            }
            sym_sym[cur.symptoms[a]] = sym_data;
            $scope.sym_syma = sym_sym;
            sym_data = {};
        }
    });
});

app.controller('Ctrl', function($scope){
        $scope.rs_data = [
            {name: "Gregory", score: 98},
            {name: "Ariaga", score: 50},
            {name: 'Qu', score: 75},
            {name: "Loserest", score: 48}
        ];

        $scope.myData = [10,20,30,40,60];
})
