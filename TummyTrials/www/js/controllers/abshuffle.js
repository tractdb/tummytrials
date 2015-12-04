// abshuffle.js     Make shuffled string of As and Bs
//
// A => hypothesized trigger (e.g., caffeine) is present on the day
// B => hypothesized trigger is absent on the day
//
// For now we just use JavaScript's random number generator. Other
// sources of randomness might be superior.
//

'use strict';

function shuffle(a)
{
    // Shuffle the array in place.
    //
    for (var i = a.length - 1; i > 0; i--) {
        var ranx = Math.floor(Math.random() * (i + 1));
        var t = a[i];
        a[i] = a[ranx];
        a[ranx] = t;
    }
}

(angular.module('tractdb.abshuffle', [])
    .factory('ABShuffle', function() {
        return {
            of_length: function(n) {
                // Return shuffled AB-string of given length. In
                // practice caller should supply an even number so the
                // numbers of As and Bs are equal.
                //
                var resar = [];
                var act = Math.floor((n + 1) / 2);
                for (var i = 0; i < n; i++)
                    resar.push(i < act);
                shuffle(resar);
                var res = '';
                resar.forEach(function(b) { res += b ? "A" : "B"; });
                return res;
            }
        };
    })
);
