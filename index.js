var base_pricemod = 1.2;
var base_buyback = .6;

var app = angular.module('dig', []);

app.factory('animate', function($window, $rootScope) {
	// So that polyfill really needs to end up in here.

	var requestAnimationFrame = $window.requestAnimationFrame;
								//||
								//$window.mozRequestAnimationFrame ||
								//$window.msRequestAnimationFrame ||
								//$window.webkitRequestAnimationFrame;

	return function(tick) {
		requestAnimationFrame(function(timestamp) {
			$rootScope.$apply(function () {
				tick(timestamp);  // Nested madness!
			});
		});
	};
});

app.directive('display', function ($window, $document, animate) {
	/* This directive is solely for view logic. */
	return {
		scope: true,
		restrict: 'A',
		template: '<div class="wrapper"></div><div class="horizon" style="background-position: 0px -{{depth}}px;"><div class="inner" data-depth="{{depth | number}}" style="height: {{depth}}px; width: {{holeWidth()}}px; background-position: 0px -{{depth}}px;"><div data-ng-repeat="(key, item) in shop" class="miniondiv" style="width: {{holeWidth()}}px;"><span data-ng-repeat="count in ngArray(item.owned) track by $index"><img data-ng-src="img/{{item.name}}.png" /></span></div></div></div>',
		link: function (scope, element, attrs) {
			// Scroll page to bottom; this is ugly.
			// scope.$watch("depth", function () {
			// 	angular.element($window).scrollTop($document.height());
			// });
			
			scope.holeWidth = function () {
				var width = 0;
				for (var prop in scope.shop) {
					if (scope.shop.hasOwnProperty(prop)) {
						width += scope.shop[prop].owned * scope.shop[prop].digValue; // Need to temper this with digValue.
					}
				}		
				
				if (width < 350) width = 350;
				return (width > 700 ? 700 : width);
			};
			
			console.log("animate", animate);
			
			(function tick() {
				angular.element($window).scrollTop($document.height());
				animate(tick);
			})();
		}
	}
});

app.controller('game', function ($scope, $timeout, $document, animate) {
	$scope.depth = 0;
	$scope.funds = 10000000000;
	$scope.digValue = 1;
	
	// Shop Items
	$scope.shop = {
		_1gopher: {
			name: "Gopher",
			desc: "The true badasses!",
			cost: 30,
			digValue: 1,
			cycle: 1,
			owned: 0
		},
		_2worker: {
			name: "Digger",
			desc: "Overworked, and underpaid.",
			cost: 50,
			digValue: 2,
			cycle: 1,
			owned: 0
		},
		_3excavator: {
			name: "Excavator",
			desc: "Displacement is the key word!",
			cost: 800,
			digValue: 20,
			cycle: 1,
			owned: 0
		},
		_4drill: {
			name: "Giant Drill",
			desc: "This ain't your daddy's hand drill.",
			cost: 7000,
			digValue: 8,
			cycle: 10,
			owned: 0
		},
		_5stoneburner: {
			name: "Stone Burners",
			desc: "Banned weaponry.",
			cost: 60000,
			digValue: 600,
			cycle: .2,
			owned: 0
		},
		_6shaihulud: {
			name: "Sandworms",
			desc: "The great makers cometh.",
			cost: 800000,
			digValue: 2000,
			cycle: 1,
			owned: 0
		},
		_7bombard: {
			name: "Orbital Bombardment",
			desc: "Not even Will Smith can stop this one.",
			cost: 2000000,
			digValue: 50000,
			cycle: .1,
			owned: 0
		}
	};
	
	$scope.achievements = [
		{
			name: "Breaking Ground",
			criteria: "depth > 0",
			desc: "Begin digging!"
		},
		{
			name: "Six Feet Under",
			criteria: "depth >= 6",
			desc: "Reach a depth of six feet."
		}
	];
	
	$scope.currentCost = function (key) {
		return Math.round($scope.shop[key].cost * Math.pow(base_pricemod, $scope.shop[key].owned));
	};
	
	$scope.dig = function (amt) {
		var digValue = amt || $scope.digValue;
		$scope.funds += digValue;
		
		$scope.depth += digValue / 5;
	};
	
	$scope.purchaseShopItem = function (key) {
		if (!key) {
			return;
		}
		
		if ($scope.funds >= $scope.currentCost(key)) {
			$scope.funds -= $scope.currentCost(key);
			$scope.shop[key].owned += 1;
		}
	};
	
	$scope.sellShopItem = function (key) {
		if (!key) {
			return;
		}
		
		if ($scope.owned > 0) {
			$scope.funds += Math.round($scope.currentCost(key) * base_buyback);
			$scope.shop[key].owned -= 1;
		}
	};
	
	$scope.ngArray = function (number) {
		return new Array(number);
	};

	var counter = 0;
	var oldtime = Date.now();
	
	// Main game logic here.
	animate(function gameloop(timestamp) {
	
		var elapsed = timestamp - oldtime;
		console.log("timestamp", timestamp);
		oldtime = timestamp;
	
		// TODO: inject underscore.
		for (var prop in $scope.shop) {
			if ($scope.shop.hasOwnProperty(prop)) {
				for (var i = 0; i < $scope.shop[prop].owned; i++) {
					$scope.dig($scope.shop[prop].digValue * elapsed * $scope.shop[prop].cycle / 1000);
				}
			}
		}
		
		// Check achievements. There is probably a better way to do this via multiple $scope.watches.
		for (var prop in $scope.achievements) {
			if ($scope.achievements.hasOwnProperty(prop)) {
				if (!($scope.achievements[prop].nailed)) {
					if ($scope.$eval($scope.achievements[prop].criteria)) {
						$scope.achievements[prop].nailed = true;
						console.log("Nailed it!");
					}
				}
			}
		}

		counter++;
		animate(gameloop);
	});
});