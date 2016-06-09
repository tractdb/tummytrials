'use strict';

(angular.module('tummytrials.faqspagectrl', 
                ['tummytrials.text'])

.controller('FaqsPageCtrl', function($scope, $sce, $stateParams, TextR, Text) {

    $scope.text = TextR;

    var text = TextR;
    var p = $stateParams.faqsection;
    var c = $stateParams.faqitem;

    $scope.title = text.faqs.topics[p].title;
    $scope.heading = text.faqs.topics[p].list[c].faq;
    $scope.content = text.faqs.topics[p].list[c].content;

    $scope.trustAsHtml = function(string) {
    	return $sce.trustAsHtml(string);
	};

// end controller
})

// end module
);