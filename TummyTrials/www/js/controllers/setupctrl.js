(angular.module('tummytrials.setupctrl',
                ['tummytrials.lc', 'tummytrials.text', 'tummytrials.setupdata',
                 'tummytrials.studyfmt', 'tummytrials.experiments'])

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
    });
})

.controller('Setup5Ctrl', function($scope, $state, LC, Text, SetupData,
                                    StudyFmt, Experiments) {

    function create_study_ob(text)
    {
        // Return a study object created from SetupData.
        //
        // SetupData.startdate  ISO 8601-like
        // SetupData.duration   days, numeric string
        // Setupdata.symptom    array of bool
        // Setupdata.trigger    numeric string (triggers[] array index)
        // <<TODO: reminder times>>
        //
        // If SetupData is complete, the returned object will be fully
        // valid. Otherwise there will be vacant spots.
        //
        // (We rely on the fact that startdate represents midnight at
        // the beginning of the day.)
        //
        var exper = {};
        var sd = new Date(SetupData.startdate || 0);

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

        // XXX Fix this when reminder times and A/B day types are
        // available.
        //
        exper.remdescrs = [
            { type: 'morning',
              reminderonly: true,
              time: 7 * 60 * 60, // Sec after midnight
              heads: ['TummyTrials Morning Reminder'],
              bodies: ['Today is a day with/without trigger']
            },
            { type: 'breakfast',
              time: 9 * 60 * 60,
              heads: ['TummyTrials Breakfast Reminder'],
              bodies: ['Please log your breakfast compliance']
            },
            { type: 'symptomEntry',
              time: 12 * 60 * 60,
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
        // the data has been saved there.
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
