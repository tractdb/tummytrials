// text.js     Textual content as a service
//

(angular.module('tummytrials.text', [ 'ionic' ])

.factory('Text', function($q, $http) {
    // For now, text doesn't change. So it's OK to keep one copy.
    //
    var alltext = null;

    return {
    all_p:
        function() {
            // Return a promise for all the text as a single object.
            //
            if (alltext) {
                var def = $q.defer();
                def.resolve(alltext);
                return def.promise;
            }
            return $http.get('json/setup.json')
            .then(function(resp) {
                alltext = resp.data;
                return alltext;
            });
        }
    };
})

);
