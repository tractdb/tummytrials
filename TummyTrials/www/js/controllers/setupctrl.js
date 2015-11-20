// setupctrl.js     Controllers for Study Setup screens
//
// The controllers communicate through shared state named SetupData, a
// JavaScript object. Current properties:
//
//     startdate       ISO 8601-like
//     duration        days, numeric string
//     symptom         array of bool
//     trigger         numeric string (triggers[] array index)
//     morning_time    Date (only H:M:S is significant)
//     breakfast_time  Date   "
//     symptom_time    Date   "
//

function timesec_of_date(date)
{
    // Translate a Date object representing a time of day into the
    // number of seconds after midnight.
    //
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

(angular.module('tummytrials.setupctrl',
                [ 'tractdb.reminders', 'tummytrials.lc', 'tummytrials.text',
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
            $scope.setupdata.duration = '18';
    });
})

.controller('Setup5Ctrl', function($scope, $state, Reminders, LC, Text,
                                    SetupData, StudyFmt, Experiments,
                                    Replicator) {

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
        var ed = new Date(sd.getFullYear(), sd.getMonth(),
                          sd.getDate() + Number(SetupData.duration || 0));

        exper.name = 'Trial beginning ' + LC.datestr(sd);
        exper.start_time = Math.floor(sd.getTime() / 1000);
        exper.end_time = Math.floor(ed.getTime() / 1000);
        exper.status = 'active';
        exper.comment = '';
        exper.symptoms = [];
        if(SetupData.symptom)
            for (var i = 0; i < text.setup2.symptoms.length; i++)
                if (SetupData.symptom[i])
                    exper.symptoms.push(text.setup2.symptoms[i].symptom);
        var tix = Number(SetupData.trigger || '');
        exper.trigger = text.setup3.triggers[tix].trigger;

        // XXX Fix this when A/B day types are available.
        //
        exper.remdescrs = [
            { type: 'morning',
              reminderonly: true,
              time: timesec_of_date(SetupData.morning_time),
              heads: ['TummyTrials Morning Reminder'],
              bodies: ['Today is a day with/without trigger']
            },
            { type: 'breakfast',
              time: timesec_of_date(SetupData.breakfast_time),
              heads: ['TummyTrials Breakfast Reminder'],
              bodies: ['Please log your breakfast compliance']
            },
            { type: 'symptomEntry',
              time: timesec_of_date(SetupData.symptom_time),
              heads: ['TummyTrials Symptom Entry Reminder'],
              bodies: ['Please log your symptom level']
            }
        ];
        exper.reports = [];

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
                $state.go('mytrials');
            });
        }
        $scope.begin_study = begin_study;

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

        // XXX test for valid reminder times
        $scope.chosen_reminder_times = studyfmt.reminderTimes();
    });
})

);
