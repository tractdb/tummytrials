(angular.module('tummytrials.notesctrl',
                [ 'tractdb.tdate', 'tractdb.reminders', 'tummytrials.lc',
                  'tummytrials.text', 'tummytrials.studyfmt', 'ionic',
                  'tummytrials.experiments', 'monospaced.elastic' ])

.controller('NotesCtrl', function($scope, $state, LC, Text, TDate, $ionicPopup,
                                    Reminders, Experiments, $window
                                   ) {


     Text.all_p()
        .then(function(text) {
            $scope.text = text;
            return Experiments.publish_p($scope);
        })
        .then(function(_) {

            $scope.tm = {};
            var thisData = {
                'note' : $scope.tm.note
            };

            var cur = $scope.study_current;
            var sd = Experiments.study_day_today(cur);
            var dur = Experiments.study_duration(cur);
            if (sd <= 0 || sd > dur)
                // Study not in progress. Nothing to submit.
                //
                return;
            var rep = null;
            if (Array.isArray(cur.reports))
                rep = cur.reports[sd - 1];
            if (!rep)
                rep = Experiments.report_new(sd);

            if(rep.note != null){
                $scope.tm.note = rep.note;
                $scope.ntexst = true;
            }

            // manual hack for different screen for back button width
            var sw = window.innerWidth;
            var box_width;
            if(sw == 320){ // iphone 5s
                box_width = 35;
            } else if(sw == 375){ // iphone 6
                box_width = 43;
            } else if(sw == 414){ // iphone 6 plus
                box_width = 48;
            } else {
                box_width = 35;
            }
            $scope.box_width = box_width;

            $scope.add_note = function(){
                var note = $scope.tm.note;
                rep.note_time = Math.floor(TDate.now() / 1000);
                rep.note = note;
                return Experiments.put_report_p(cur.id, rep)
                    .then(function(_){
                        var alertPopup = $ionicPopup.alert({
                            title: 'Note Posted',
                            template: 'Your note has been succcessfully added to today\'s report.',
                            buttons: [{ text: 'Ok', 
                                        type: 'button-energized'}]

                        });

                        alertPopup.then(function(res) {
                            $state.go('current'); //doesn't work
                         // console.log('Thank you for not eating my delicious ice cream cone');
                        });
                    });
            };



        });

    
})

);