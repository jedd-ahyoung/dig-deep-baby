var base_pricemod = 1.2;
var base_buyback = .6;

var app = angular.module('dig', []);

app.directive('display', function ($window, $document) {
	/* This directive is solely for view logic. */
	return {
		scope: true,
		restrict: 'A',
		template: '<div class="wrapper"></div><div class="horizon"><div class="inner" style="height: {{depth}}px; width: {{holeWidth()}}px;"><div class="miniondiv">This is a test</div></div></div>',
		link: function (scope, element, attrs) {
			// Scroll page to bottom; this is ugly.
			scope.$watch("depth", function () {
				angular.element($window).scrollTop($document.height());
			});
			
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
		}
	}
});

app.controller('game', function ($scope, $timeout, $document, $window) {
	$scope.depth = 0;
	$scope.funds = 1000;
	$scope.digValue = 1;
	
	// Shop Items
	$scope.shop = {
		_1gopher: {
			name: "Gopher",
			desc: "The true badasses!",
			cost: 30,
			digValue: 1,
			cycle: 10,
			owned: 0
		},
		_2worker: {
			name: "Digger",
			desc: "Overworked, and underpaid.",
			cost: 50,
			digValue: 2,
			cycle: 10,
			owned: 0
		},
		_3excavator: {
			name: "Excavator",
			desc: "Displacement is the key word!",
			cost: 800,
			digValue: 20,
			cycle: 10,
			owned: 0
		},
		_4drill: {
			name: "Giant Drill",
			desc: "This ain't your daddy's hand drill.",
			cost: 7000,
			digValue: 8,
			cycle: 1,
			owned: 0
		},
		_5stoneburner: {
			name: "Stone Burners",
			desc: "Banned weaponry.",
			cost: 60000,
			digValue: 600,
			cycle: 50,
			owned: 0
		},
		_6shaihulud: {
			name: "Sandworms",
			desc: "The great makers cometh.",
			cost: 800000,
			digValue: 2000,
			cycle: 10,
			owned: 0
		},
		_7bombard: {
			name: "Orbital Bombardment",
			desc: "Not even Will Smith can stop this one.",
			cost: 2000000,
			digValue: 50000,
			cycle: 100,
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
		
		if (digValue > 5) {
			var depthToAdd = (digValue - (digValue % 5)) / 5;
			$scope.depth += depthToAdd;
		} else if (!($scope.funds % 5)) {
			$scope.depth += digValue;
		}
	};
	
	var counter = 0;

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

	// Main game logic here.
	$timeout(function gameloop() {
		// TODO: inject underscore.
		for (var prop in $scope.shop) {
			if ($scope.shop.hasOwnProperty(prop)) {
				if (!(counter % $scope.shop[prop].cycle)) {
					for (var i = 0; i < $scope.shop[prop].owned; i++) {
						$scope.dig($scope.shop[prop].digValue);
					}
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
		$timeout(gameloop, 100);
	}, 100);
});