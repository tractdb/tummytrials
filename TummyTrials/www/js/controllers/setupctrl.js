// setupctrl.js     Controllers for Study Setup screens
//
// The controllers communicate through shared state named SetupData, a
// JavaScript object. Current properties:
//
//     startdate                ISO 8601-like
//     duration                 days, numeric string
//     symptom                  array of bool
//     trigger                  numeric string (triggers[] array index)
//     morning_time             Date (only H:M:S is significant)
//     breakfast_time           Date   "
//     symptom_time             Date   "
//     breakfast_preference     key,value object {"breakfast":"Cereal"}
//     drink_preference          key,value object {"drink":"Milk"}

function timesec_of_date(date)
{
    // Translate a Date object representing a time of day into the
    // number of seconds after midnight.
    //
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

(angular.module('tummytrials.setupctrl',
                [ 'tractdb.tdate', 'tractdb.reminders', 'tractdb.abshuffle',
                  'tummytrials.lc', 'tummytrials.text',
                  'tummytrials.setupdata', 'tummytrials.studyfmt',
                  'tummytrials.experiments', 'tummytrials.replicator' ])

.controller('Setup2Ctrl', function($scope, Text, SetupData) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        $scope.setupdata = SetupData;
        if(!$scope.setupdata.symptom) {
            $scope.setupdata.symptom = [];
            for (var i = 0; i < text.setup2.symptoms.length; i++)
                $scope.setupdata.symptom[i] = false;
        }
    });
})

.controller('Setup3Ctrl', function($scope, Text, SetupData) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        $scope.setupdata = SetupData;
    });
})

.controller('Setup4Ctrl', function($scope, Text, SetupData) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        $scope.setupdata = SetupData;

        // Default reminder times. Note that the input[time] element
        // requires a JavaScript Date as its Angular model. (Something I
        // just learned recently.)
        //
        if (!$scope.setupdata.morning_time)
            $scope.setupdata.morning_time = new Date(1970, 0, 1, 7, 0, 0);
        if (!$scope.setupdata.breakfast_time)
            $scope.setupdata.breakfast_time = new Date(1970, 0, 1, 9, 0, 0);
        if (!$scope.setupdata.symptom_time)
            $scope.setupdata.symptom_time = new Date(1970, 0, 1, 12, 0, 0);
        if (!$scope.setupdata.evening_time)
            $scope.setupdata.evening_time = new Date(1970, 0, 1, 18, 0, 0);

        // Default experiment start time. Again, a JavaScript Date
        // object is required as the Angular model for the input[date]
        // element. This is good to know.
        //
        if (!$scope.setupdata.startdate) {
            var d = new Date();
            d.setDate(d.getDate() + 1); // Trial starts tomorrow by default
            $scope.setupdata.startdate = d;
        }

        // Default duration.
        //
        if (!$scope.setupdata.duration)
            $scope.setupdata.duration = '12';
    });
})

.controller('Setup4bCtrl', function($scope, Text, SetupData){
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        $scope.setupdata = SetupData;


        var trigger_selected = SetupData.trigger; 
        var trigger_num = text.setup4b.triggers.length; 

        // Get name of trigger to show in heading for on and off day meals
        for(var i = 0; i < trigger_num; i++){
            if(trigger_selected == i){ 
                var trig_name = text.setup4b.triggers[i].trigger;
            }
        }
        $scope.trig_name = trig_name;

        var desc_text = text.setup4b.breakfast_text;
            desc_text = desc_text.replace("{{trigger}}",trig_name);
            desc_text = desc_text.replace("{{trigger}}",trig_name); // lazy replacement. {{trigger}} appers twice in the sentence

        if(typeof(trigger_selected) == "undefined"){
            $scope.desc_text = "Please select a possible trigger on screen 2.";
        } else {
            $scope.desc_text = desc_text;
        }
 

        // Placeholder text till the user chooses a breakfast and drink option.
        $scope.bfst_on = text.setup4b.bfst_on_holder;
        $scope.bfst_off = text.setup4b.bfst_off_holder;
        $scope.drnk_on = text.setup4b.drnk_on_holder;
        $scope.drnk_off = text.setup4b.drnk_off_holder;

        // var drink_selected = SetupData.drink_prefernce.drink;     
        var breakfast_on, breakfast_off, drink_on, drink_off;
        $scope.$watch(function(scope) { return SetupData.breakfast_preference},
              function() {
                if(SetupData.hasOwnProperty('breakfast_preference')){
                    var breakfast_selected = SetupData.breakfast_preference.breakfast;
                    //loop over the trigger json array for matching the selection
                    for(var i = 0; i < trigger_num; i++){
                        if(trigger_selected == i){ 
                            var on_meals = text.setup4b.triggers[i].condition[0];
                            breakfast_on = on_meals[breakfast_selected];
                            var off_meals = text.setup4b.triggers[i].condition[1];
                            breakfast_off = off_meals[breakfast_selected];
                        }
                    }
                    $scope.bfst_slc = breakfast_selected;
                    $scope.bfst_on = breakfast_on;
                    $scope.bfst_off = breakfast_off;
                }
        });

        $scope.$watch(function(scope) { return SetupData.drink_preference},
              function() {
                if(SetupData.hasOwnProperty('drink_preference')){
                    var drink_selected = SetupData.drink_preference.drink;
                    //loop over the trigger json array for matching the selection
                    for(var i = 0; i < trigger_num; i++){
                        if(trigger_selected == i){ 
                            var on_meals = text.setup4b.triggers[i].condition[0];
                            drink_on = on_meals[drink_selected];
                            var off_meals = text.setup4b.triggers[i].condition[1];
                            drink_off = off_meals[drink_selected];
                        }
                    }
                    $scope.drnk_slc = drink_selected;
                    $scope.drnk_on = drink_on;
                    $scope.drnk_off = drink_off;
                }
        });


    });
})

.controller('Setup5Ctrl', function($scope, $state, ABShuffle,
                                   Reminders, LC, Text, SetupData,
                                   StudyFmt, Experiments, Replicator) {

    function reminder_heads(title)
    {
        var heads = [];
        var duration = Number(SetupData.duration || 0);
        for (var day = 1; day <= duration; day++) {
            var h = title;
            if (h != "") 
                h = h + ' ';
            h = h + text.setup5.day_counter.replace("{DAY}", day);
            heads.push(h);
        }
        return heads;
    }

    function morning_bodies(text, abstring)
    {
        // Calculate the morning reminder bodies from SetupData and the
        // given random A/B string.
        //
        var bodies = [];
        var duration = Number(SetupData.duration || 0);
        var tix = Number(SetupData.trigger || 0);

        var triggerdesc = { phrase_plus: 'embrace trigger',
                            phrase_minus: 'avoid trigger'};
        if (tix >= 0 && tix < text.setup3.triggers.length)
            triggerdesc = text.setup3.triggers[tix];

        for (var i = 1; i <= duration; i++) {
            var aorb;
            if (abstring.substr(i - 1, 1) == "A")
                aorb = triggerdesc.phrase_plus;
            else
                aorb = triggerdesc.phrase_minus;
            var b = text.setup5.morning_reminder_text.replace("{AORB}", aorb);
            bodies.push(b);
        }
        return bodies;
    }

    function create_study_ob(text)
    {
        // Return a study object created from SetupData.
        //
        // If SetupData is complete, the returned object will be fully
        // valid. Otherwise there will be vacant spots.
        //
        var exper = {};
        var sd = new Date(SetupData.startdate);
        sd.setHours(0);
        sd.setMinutes(0);
        sd.setSeconds(0);

        // (Use the Date machinery to work around daylight savings etc.)
        //
        var duration = Number(SetupData.duration || 0);
        var ed = new Date(sd.getFullYear(), sd.getMonth(),
                          sd.getDate() + duration);

        exper.name = 'Trial beginning ' + LC.datestr(sd);
        exper.start_time = Math.floor(sd.getTime() / 1000);
        exper.end_time = Math.floor(ed.getTime() / 1000);
        exper.status = 'active';
        exper.comment = '';
        exper.abstring = ABShuffle.of_length(duration);
        exper.symptoms = [];
        if(SetupData.symptom)
            for (var i = 0; i < text.setup2.symptoms.length; i++)
                if (SetupData.symptom[i])
                    exper.symptoms.push(text.setup2.symptoms[i].symptom);
        var tix = Number(SetupData.trigger || '');
        exper.trigger = text.setup3.triggers[tix].trigger;

        exper.remdescrs = [
            { type: 'morning',
              time: timesec_of_date(SetupData.morning_time),
              badge: 'count',
              heads_all: reminder_heads(text.setup5.morning_reminder_title),
              bodies_all: morning_bodies(text, exper.abstring)
            },
            { type: 'breakfast',
              time: timesec_of_date(SetupData.breakfast_time),
              badge: 'count',
              heads_lt: reminder_heads(text.setup5.breakfast_reminder_title),
              bodies_lt: [text.setup5.breakfast_reminder_text]
            },
            { type: 'symptomEntry',
              time: timesec_of_date(SetupData.symptom_time),
              badge: 'count',
              heads_lt: reminder_heads(text.setup5.symptomEntry_reminder_title),
              bodies_lt: [text.setup5.symptomEntry_reminder_rep_text],
              heads_ge: reminder_heads(text.setup5.symptomEntry_reminder_title),
              bodies_ge: [text.setup5.symptomEntry_reminder_upd_text]
            },
            { type: 'evening',
              time: timesec_of_date(SetupData.evening_time),
              badge: 'pass',
              heads_lt: reminder_heads(text.setup5.evening_reminder_title),
              bodies_lt: [text.setup5.evening_reminder_text]
            }
        ];
        if(SetupData.hasOwnProperty('breakfast_preference')){
            exper.breakfast_pref =  SetupData.breakfast_preference.breakfast;
            for(var i = 0; i < text.setup4b.triggers.length; i++){
                if(SetupData.trigger == i){ 
                    var on_meals = text.setup4b.triggers[i].condition[0];
                    exper.breakfast_on_prompt = on_meals[SetupData.breakfast_preference.breakfast];
                    var off_meals = text.setup4b.triggers[i].condition[1];
                    exper.breakfast_off_prompt = off_meals[SetupData.breakfast_preference.breakfast];
                }
            }
        }
        if(SetupData.hasOwnProperty('drink_preference')){
            exper.drink_pref = SetupData.drink_preference.drink;
            for(var i = 0; i < text.setup4b.triggers.length; i++){
                if(SetupData.trigger == i){ 
                    var on_meals = text.setup4b.triggers[i].condition[0];
                    exper.drink_on_prompt = on_meals[SetupData.drink_preference.drink];
                    var off_meals = text.setup4b.triggers[i].condition[1];
                    exper.drink_off_prompt = off_meals[SetupData.drink_preference.drink];
                }
            }
        }
        exper.reports = [];
        exper.reason = "";

        return exper;
    }

    function create_study_p(text)
    {
        // Return a promise to create the study; i.e., add document to
        // database. Data comes from SetupData. Caller warrants that all
        // the data has been saved there. The promise resolves to the id
        // of the study.
        //
        var exper = create_study_ob(text);
        return Experiments.add(exper);
    }

    var text;
    var study;

    Text.all_p()
    .then(function(alltext) {
        text = alltext;
        $scope.text = alltext;
        study = create_study_ob(text);
        $scope.study = study;
        return StudyFmt.new_p(study);
    })
    .then(function(studyfmt) {
        $scope.setupdata = SetupData;

        // Function to create study when all data is available.
        //
        function begin_study()
        {
            $scope.begin_study_called = true;
            create_study_p(text)
            .then(function(experid) {
                return Experiments.get(experid);
            })
            .then(function(exper) {
                // Start up a replication. Not waiting for it to finish.
                //
                Replicator.replicate_p();

                // Set up reminders. (FWIW, this work will be repeated
                // when the replication is finished. But replication is
                // not guaranteed to work any particular time; it
                // requires a working network connection.)
                //
                return Reminders.sync(exper.remdescrs, exper.start_time,
                                        exper.end_time, {});
            })
            .then(function(_) {
                $state.go('setup_6');
            });
        }
        $scope.begin_study = begin_study;
        $scope.begin_study_called = false;

        // Set some values in the scope for the template to use:
        //
        // study_data_complete:   (bool) All study data has been specified
        // study                  (object) Study (possibly incomplete)
        // chosen_topic:          (string) Description of the study
        // chosen_symptoms:       (string array) Symptoms to follow
        // chosen_date_range:     (string) Start and end dates
        // chosen_reminder_times: (hash) Reminder times

        $scope.study_data_complete = true;

        if ($scope.setupdata.trigger) {
            $scope.chosen_topic = studyfmt.topicQuestion();
        } else {
            $scope.chosen_topic = text.setup5.notopic;
            $scope.study_data_complete = false;
        }

        $scope.chosen_symptoms = [];
        for (var i = 0; i < text.setup2.symptoms.length; i++)
            if ($scope.setupdata.symptom[i])
                $scope.chosen_symptoms.push(text.setup2.symptoms[i].symptom);
        if ($scope.chosen_symptoms.length < 1) {
            $scope.chosen_symptoms.push(text.setup5.nosymptom);
            $scope.study_data_complete = false;
        }

        if ($scope.setupdata.startdate && $scope.setupdata.duration) {
            $scope.chosen_date_range = studyfmt.dateRange();
        } else {
            $scope.chosen_date_range = text.setup5.nolength;
            $scope.study_data_complete = false;
        }

        if(SetupData.hasOwnProperty('breakfast_preference')){
            $scope.breakfast_pref =  SetupData.breakfast_preference.breakfast;
        } else {
            $scope.breakfast_pref = text.setup5.no_food;
            $scope.study_data_complete = false;
        }

        if(SetupData.hasOwnProperty('drink_preference')){
            $scope.drink_pref = SetupData.drink_preference.drink;
            // for(var i = 0; i < text.setup4b.triggers.length; i++){
            //     if(SetupData.trigger == i){ 
            //         var on_meals = text.setup4b.triggers[i].condition[0];
            //         $scope.breakfast_on_prompt = on_meals[SetupData.breakfast_preference.breakfast];
            //         $scope.drink_on_prompt = on_meals[SetupData.drink_preference.drink];
            //         var off_meals = text.setup4b.triggers[i].condition[1];
            //         $scope.breakfast_off_prompt = off_meals[SetupData.breakfast_preference.breakfast];
            //         $scope.drink_off_prompt = off_meals[SetupData.drink_preference.drink];
            //     }
            // }
        } else {
            $scope.drink_pref = text.setup5.no_drink;
            $scope.study_data_complete = false;
        }

        // XXX test for valid reminder times
        $scope.chosen_reminder_times = studyfmt.reminderTimes();
    });
})


.controller('Setup6Ctrl', function($scope, Text, SetupData) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        $scope.setupdata = SetupData;

        var subtitle = text.setup6.subtitle;
        var duration = Number(SetupData.duration || 0);
        var breakfast_pref =  SetupData.breakfast_preference.breakfast;
        var drink_pref = SetupData.drink_preference.drink;

        subtitle = subtitle.replace("{{12}}", duration);
        subtitle = subtitle.replace("{{breakfast}}", breakfast_pref);
        subtitle = subtitle.replace("{{drink}}", drink_pref);
        $scope.subtitle = subtitle;

        for(var i = 0; i < text.setup4b.triggers.length; i++){
            if(SetupData.trigger == i){ 
                var trig_name = text.setup4b.triggers[i].trigger;
                $scope.trig_name = trig_name;                
                var on_meals = text.setup4b.triggers[i].condition[0];
                $scope.breakfast_on_prompt = on_meals[SetupData.breakfast_preference.breakfast];
                $scope.drink_on_prompt = on_meals[SetupData.drink_preference.drink];
                var off_meals = text.setup4b.triggers[i].condition[1];
                $scope.breakfast_off_prompt = off_meals[SetupData.breakfast_preference.breakfast];
                $scope.drink_off_prompt = off_meals[SetupData.drink_preference.drink];
            }
        }

        //Help toggle
        $scope.help = false;

    });
})

);
