(angular.module('tummytrials.notesctrl',
                [ 'tractdb.tdate', 'tractdb.reminders', 'tummytrials.lc',
                  'tummytrials.text', 'tummytrials.studyfmt', 'ionic',
                  'tummytrials.experiments' ])

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

            $scope.add_note = function(){
                var note = $scope.tm.note;
                rep.note_time = Math.floor(TDate.now() / 1000);
                rep.note = note;
                console.log("note " + note);
                return Experiments.put_report_p(cur.id, rep)
                    .then(function(_){
                        var alertPopup = $ionicPopup.alert({
                            title: 'Note Posted',
                            template: 'Your note has been succcessfully added to today\'s report.'
                        });

                       alertPopup.then(function(res) {
                         // console.log('Thank you for not eating my delicious ice cream cone');
                       });
                    });
            };



        });

    
})

);