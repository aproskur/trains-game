const config = {
    type: Phaser.AUTO,
    width: 1250,
    height: 550,
    backgroundColor: '#87CEEB',
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.image('map', 'images/map.webp');
    // this.load.image('locomotive', 'images/locomotive.png');
    // this.load.image('train1', 'images/train-1.png');
    // this.load.image('train2', 'images/train-2.png');
    // this.load.image('train3', 'images/train-3.png');
    // this.load.image('train4', 'images/train-4.png');
}

let trainGraphics;
let infoPanelWagonGraphics;
let infoPanelTrainGraphics;

function create() {
    trainGraphics = this.add.graphics();
    infoPanelWagonGraphics = this.add.graphics();
    infoPanelTrainGraphics = this.add.graphics();
    infoPanelTrainGraphics.setScrollFactor(0);




    // Define starting Y position for the train graphics
    trainDisplayY = 310;

    const mapWidth = 0.7 * config.width;  // 70% of canvas for the map
    const infoPanelWidth = 0.3 * config.width;  // 30% of canvas for the info panel

    // --- Map Layer ---
    const mapLayer = this.add.layer();  // Layer for the map elements

    // Create and display the map inside the map layer
    const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
    map.setDisplaySize(mapWidth, config.height);  // Set map size to fit left 70% of canvas
    mapLayer.add(map);  // Add map to the map layer

    // Set world boundaries to match the map size
    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height); // Camera bounds match the map

    // Center the camera on the middle of the map
    this.cameras.main.centerOn(map.width * 0.5, map.height * 0.5);

    // Enable dragging to move the camera
    this.input.on('pointermove', function (pointer) {
        if (pointer.isDown) {
            // Adjust camera scroll based on pointer movement
            this.cameras.main.scrollX -= (pointer.prevPosition.x - pointer.position.x);
            this.cameras.main.scrollY -= (pointer.prevPosition.y - pointer.position.y);
        }
    }, this);

    const wagonColors = {
        'train1': 0x2ECC71,  // Bright Green for train1
        'train2': 0xF1C40F,  // Bright Yellow for train2
        'train3': 0x9B59B6,  // Bright Purple for train3
        'train4': 0xE67E22   // Bright Orange for train4
    };

    const stations = []; // Array to store all station objects
    let attachedWagons = []; // Array to store wagons attached to the locomotive
    let locomotive;

    // Define station positions, connections, and which stations have wagons or locomotives
    const stationPositions = [
        { id: 1, x: 237, y: 215, name: "Весёлая лужайка", connections: [2], hasLocomotive: true, wagonTypes: [] },
        { id: 2, x: 441, y: 154, name: "Кукурузное поле", connections: [1, 4], hasLocomotive: false, wagonTypes: ['train4', 'train4'] },
        { id: 3, x: 254, y: 504, name: "Солнечный берег", connections: [], hasLocomotive: false, wagonTypes: [] },
        { id: 4, x: 700, y: 350, name: "Весёлый паровозик", connections: [2, 5, 6], hasLocomotive: false, wagonTypes: ['train3', 'train3', 'train1'] },
        { id: 5, x: 719, y: 85, name: "Эверест", connections: [4], hasLocomotive: false, wagonTypes: ['train2', 'train2', 'train3'] },
        { id: 6, x: 397, y: 366, name: "Зелёная станция", connections: [4, 7], hasLocomotive: false, wagonTypes: [] },
        { id: 7, x: 450, y: 600, name: "Правый берег", connections: [6, 8], hasLocomotive: false, wagonTypes: [] },
        { id: 8, x: 213, y: 737, name: "Заречье", connections: [7, 9], hasLocomotive: false, wagonTypes: [] },
        { id: 9, x: 725, y: 636, name: "Поляна", connections: [8, 10], hasLocomotive: false, wagonTypes: ['train1'] },
        { id: 10, x: 823, y: 817, name: "Дальний лес", connections: [9], hasLocomotive: false, wagonTypes: [] }
    ];


    // --- Info Panel (Fixed Position) ---
    // Create a fixed background for the info panel (right 30% of canvas)
    const infoPanelBackground = this.add.graphics();
    infoPanelBackground.fillStyle(0xF4F4F4, 1);  // Light gray background for the info panel
    infoPanelBackground.fillRect(mapWidth, 0, infoPanelWidth, config.height);  // Right 30% of canvas

    // Add text for displaying station information
    const infoTextTitle = this.add.text(mapWidth + 20, 20, 'Информация:', { font: '24px Arial', fill: '#000' });
    const stationNameText = this.add.text(mapWidth + 20, 60, 'Станция: N/A', { font: '18px Arial', fill: '#000' });
    const wagonText = this.add.text(mapWidth + 20, 100, 'Вагоны: сейчас на станции нет вагонов', { font: '18px Arial', fill: '#000' });

    // Fix the info panel position to make sure it doesn't scroll
    infoPanelBackground.setScrollFactor(0);  // Info panel stays static
    infoTextTitle.setScrollFactor(0);
    stationNameText.setScrollFactor(0);
    wagonText.setScrollFactor(0);

    // Function to update the info panel when a station is clicked
    // Update the info panel function
    // Modify updateInfoPanel to ensure drawing
    function updateInfoPanel(stationName, wagons) {
        stationNameText.setText(`Станция: ${stationName}`);
        infoPanelWagonGraphics.clear(); // Clear only the station graphics

        const startX = mapWidth + 40;  // X offset for station wagon circles
        let offsetY = 150;             // Y offset for station wagons
        const circleRadius = 10;       // Radius for each station wagon circle
        const circleSpacing = 25;      // Spacing between station wagon circles

        // Display title for wagons
        if (wagons.length === 0) {
            wagonText.setText('Вагоны:  сейчас на станции нет вагонов');
        } else {
            wagonText.setText('Вагоны:');
        }

        wagonText.setPosition(mapWidth + 20, 110);

        // Ensure station wagon graphics stay static on the panel
        infoPanelWagonGraphics.setScrollFactor(0);

        // Draw each wagon type as a circle with color
        wagons.forEach((wagonType, index) => {
            const wagonColor = wagonColors[wagonType] || 0xFFFFFF;

            // Draw each wagon as a circle with color
            infoPanelWagonGraphics.fillStyle(wagonColor, 1);
            infoPanelWagonGraphics.fillCircle(startX, offsetY + (index * circleSpacing), circleRadius);
        });

        infoPanelWagonGraphics.setDepth(10); // Set depth to avoid overlapping issues
    }

    // --- Train Graphics Label ---
    const trainLabel = this.add.text(
        mapWidth + 40,
        'Конфигурация поезда:',
        { font: '18px Arial', fill: '#000' }
    );
    trainLabel.setScrollFactor(0); // Fix label to info panel


    function updateTrainGraphics() {
        infoPanelTrainGraphics.clear();

        const startX = map.width + 40;
        const trainDisplayY = 300;

        const locomotiveWidth = 40;
        const locomotiveHeight = 20;
        const circleRadius = 10;
        const spacing = 5;

        // Draw the Locomotive
        infoPanelTrainGraphics.fillStyle(0xE84393, 1);
        infoPanelTrainGraphics.fillRect(startX, trainDisplayY, locomotiveWidth, locomotiveHeight);

        // Draw each wagon as a Circle, positioned Beside the locomotive
        attachedWagons.forEach((wagon, index) => {
            const wagonColor = wagonColors[wagon.wagonType] || 0xFFFFFF; // Wagon color
            const xPos = startX + locomotiveWidth + (index + 1) * (circleRadius * 2 + spacing); // Position next to locomotive

            infoPanelTrainGraphics.fillStyle(wagonColor, 1); // Set color for each wagon
            infoPanelTrainGraphics.fillCircle(xPos, trainDisplayY + locomotiveHeight / 2, circleRadius); // Draw as circle
        });

        infoPanelTrainGraphics.setDepth(5); // Ensure train display stays above other graphics


    }


    // Step 1: Draw the stations on the map
    stationPositions.forEach((stationData) => {
        let station = this.add.circle(stationData.x, stationData.y, 15, 0x4A3267, 0.5); // Add station circle
        station.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains); // Make station clickable

        station.stationID = stationData.id; // Assign the station's ID
        stations.push(station); // Add station to the array
        mapLayer.add(station);  // Add the station to the map layer

        // Add station name text below the station
        this.add.text(stationData.x, stationData.y + 30, stationData.name, {
            font: '16px Arial',
            fill: '#000000'
        }).setOrigin(.5);

        // Add locomotive if the station has one
        if (stationData.hasLocomotive) {
            //locomotive = this.add.image(stationData.x, stationData.y, 'locomotive');
            locomotive = this.add.rectangle(stationData.x, stationData.y, 50, 25, 0xE84393);
            locomotive.setScale(0.5);
            locomotive.setDepth(1);
            locomotive.setInteractive();
            locomotive.currentStation = stationData.id; // Track which station the locomotive is at
        }

        // Find the initial station where the locomotive is located
        const initialStation = stationPositions.find(station => station.hasLocomotive);

        if (initialStation) {
            // Set the locomotive's current station ID
            locomotive.currentStation = initialStation.id;

            // Show the station name and wagons in the info panel
            updateInfoPanel(initialStation.name, initialStation.wagonTypes);
        }

        // Initialize wagons array at the station
        stationData.wagons = [];

        // Add a wagon to the station if it has one
        if (stationData.wagonTypes && stationData.wagonTypes.length > 0) {
            // let wagon = this.add.image(stationData.x, stationData.y, stationData.wagonType).setScale(0.5); // Add and scale the wagon

            let wagonColor = wagonColors[stationData.wagonTypes] || 0xFFFFFF; // Default color is white if no type is found

            const stationRadius = 15;  // Radius of station circle
            const wagonRadius = 10;    // Smaller radius for wagons
            const offsetDistance = stationRadius + 20;  // Increased distance from station to avoid rails and names
            const angleIncrement = 360 / stationData.wagonTypes.length;

            // Skip certain angles (avoid bottom side where station names are located)
            const avoidAngleStart = Phaser.Math.DegToRad(120);  // Start of the angle to avoid (below the station)
            const avoidAngleEnd = Phaser.Math.DegToRad(240);    // End of the angle to avoid

            stationData.wagonTypes.forEach((wagonType, index) => {
                let wagonColor = wagonColors[wagonType] || 0xFFFFFF; // Default to white 
                let angle = Phaser.Math.DegToRad(angleIncrement * index);  // Convert degrees to radians

                if (angle >= avoidAngleStart && angle <= avoidAngleEnd) {
                    angle += Phaser.Math.DegToRad(angleIncrement);  // Adjust the angle to skip the "name" zone
                }

                const offsetX = Math.cos(angle) * offsetDistance;
                const offsetY = Math.sin(angle) * offsetDistance;

                // Create the wagon as a smaller circle and position it outside the station
                let wagon = this.add.circle(stationData.x + offsetX, stationData.y + offsetY, wagonRadius, wagonColor);
                wagon.setInteractive();  // Make the wagon clickable
                wagon.setDepth(1);  // Ensure wagons are above rails and other elements

                wagon.wagonType = wagonType; // Set the wagon type on the wagon instance
                wagon.originalX = wagon.x;
                wagon.originalY = wagon.y;
                wagon.stationID = stationData.id;

                stationData.wagons.push(wagon);  // Add the wagon to the station's wagons array

                console.log(`Wagon of type ${wagonType} created at station ${stationData.id}`);
            });



        }
    });
    const OFFSET = 15; // Distance to offset the track lines from station centers

    // Step 2: Draw track lines between connected stations
    // 1. count angle between the stations (phaser)
    // Math.cos(angle) - how much to move in the X direction 
    //Math.sin(angle) - how much to move in the Y direction
    // from A to B

    stationPositions.forEach(stationData => {
        stationData.connections.forEach(connectedStationId => {
            const connectedStationData = stationPositions.find(s => s.id === connectedStationId); // Find connected station

            if (connectedStationData) {
                const stationA = { x: stationData.x, y: stationData.y }; // Current station coordinates
                const stationB = { x: connectedStationData.x, y: connectedStationData.y }; // Connected station coordinates

                // Calculate angle between the two stations
                const angle = Phaser.Math.Angle.Between(stationA.x, stationA.y, stationB.x, stationB.y);

                // Offset the start and end points of the track
                const startX = stationA.x + Math.cos(angle) * OFFSET;
                const startY = stationA.y + Math.sin(angle) * OFFSET;
                const endX = stationB.x - Math.cos(angle) * OFFSET;
                const endY = stationB.y - Math.sin(angle) * OFFSET;

                // Draw the track line
                let graphics = this.add.graphics();
                graphics.lineStyle(4, 0x645452, 0.4); // Set line color and opacity
                graphics.beginPath();
                graphics.moveTo(startX, startY); // Move to start of the line
                graphics.lineTo(endX, endY); // Draw the line to the connected station
                graphics.strokePath(); // Finalize the line drawing
            }
        });
    });

    /*
stationPositions.forEach(stationData => {
    stationData.connections.forEach(connectedStationId => {
        const connectedStationData = stationPositions.find(s => s.id === connectedStationId); // Find connected station

        // Only draw the line if the connected station ID is greater, to avoid drawing duplicates
        if (connectedStationData && connectedStationData.id > stationData.id) {
            const stationA = { x: stationData.x, y: stationData.y }; // Current station coordinates
            const stationB = { x: connectedStationData.x, y: connectedStationData.y }; // Connected station coordinates

            // Apply a static offset to the start and end points of the line
            const startX = stationA.x + OFFSET;
            const startY = stationA.y + OFFSET;
            const endX = stationB.x - OFFSET;
            const endY = stationB.y - OFFSET;

            // Draw the track line between stationA and stationB
            let graphics = this.add.graphics();
            graphics.lineStyle(4, 0x645452, 0.4); // Set line color and opacity
            graphics.beginPath();
            graphics.moveTo(startX, startY); // Move to start of the line (with offset)
            graphics.lineTo(endX, endY); // Draw the line to the connected station (with offset)
            graphics.strokePath(); // Finalize the line drawing
        }
    });
});

    */

    // Step 3: Function to move the locomotive between stations
    //TODO follow up wagons. which station they arrived (for correct decoupling)

    function moveLocomotive(fromStationId, toStationId) {
        const fromStation = stationPositions.find(s => s.id === fromStationId); // Get current station
        const toStation = stationPositions.find(s => s.id === toStationId); // Get destination station

        if (!fromStation || !toStation) {
            console.log("Move failed: From or To station not found.");
            return;
        }

        //console.log(`Moving locomotive from station ${fromStationId} to station ${toStationId}`);

        // Calculate angle to rotate the locomotive towards the target station
        const angle = Phaser.Math.Angle.Between(fromStation.x, fromStation.y, toStation.x, toStation.y);
        locomotive.setRotation(angle); // Set locomotive rotation

        // Tween (animate) the locomotive movement to the new station
        this.tweens.add({
            targets: locomotive,
            x: toStation.x,
            y: toStation.y,
            duration: 2000,
            ease: 'Power2',
            onUpdate: () => {
                updateWagonPositions(); // Update wagon positions during movement
            },
            onComplete: () => {
                locomotive.currentStation = toStationId;

                attachedWagons.forEach((wagon, index) => {
                    wagon.stationID = toStationId;  // Update only attached wagons to new station
                    wagon.originalX = wagon.x;
                    wagon.originalY = wagon.y;
                    console.log(`Attached wagon ${index + 1} updated to station ${toStationId} at (${wagon.originalX}, ${wagon.originalY})`);
                });

                updateWagonPositions(); // Final update for the attached wagons
                updateTrainGraphics();
            }
        });
    }



    // Attach a wagon to the train only if it's on the same station where the locomotive is located
    const attachWagon = (wagon) => {
        console.log("attach wagon function is workin");
        // Check if the wagon's station ID matches the locomotive's current station
        if (locomotive.currentStation !== wagon.stationID) {
            console.log(`Cannot attach wagons from station ${wagon.stationID} when the locomotive is at station ${locomotive.currentStation}.`);
            return; // Prevent attachment if the locomotive is not at the same station
        }

        attachedWagons.push(wagon); // Add the wagon to the attached wagons array
        wagon.attachedToTrain = true;  // Mark wagon as attached

        //draw train in info panel
        updateTrainGraphics();

        // Re-enable dragging after the wagon is coupled to the train
        this.input.setDraggable(wagon, true);  // Allow dragging again after it's attached

        // Remove the wagon from the station's wagon list since it's attached to the train
        const station = stationPositions.find(s => s.id === wagon.stationID);
        if (station) {
            station.wagons = station.wagons.filter(w => w !== wagon);
        }

        // Also remove the wagon type from `wagonTypes` using the type
        const wagonIndex = station.wagonTypes.indexOf(wagon.wagonType);
        if (wagonIndex > -1) {
            station.wagonTypes.splice(wagonIndex, 1);
        }

        updateWagonPositions(); // Update wagon positions after attachment
    };

    // Handle the drag and drop functionality directly on the wagons
    stationPositions.forEach((stationData) => {
        stationData.wagons.forEach((wagon) => {
            wagon.setInteractive();  // Make wagon interactive for dragging
            this.input.setDraggable(wagon);  // Enable dragging

            // Store the original station for each wagon
            wagon.currentStation = stationData.id;

            wagon.on('drag', (pointer, dragX, dragY) => {
                wagon.x = dragX;
                wagon.y = dragY;
            });

            // On drag start: Decouple the wagon if it's attached to the train
            wagon.on('dragstart', () => {
                if (wagon.attachedToTrain) {
                    console.log(`Wagon was attached to the train. Decoupling it now.`);

                    // Immediately decouple the wagon from the locomotive
                    attachedWagons = attachedWagons.filter(w => w !== wagon);
                    //wagon.attachedToTrain = false;  // Mark wagon as decoupled

                    console.log(`Wagon successfully decoupled from train. Remaining attached wagons: ${attachedWagons.length}`);

                    // Update the positions of the remaining wagons to close the gap
                    updateWagonPositions();
                } else {
                    console.log(`Dragging an already uncoupled wagon at station ${wagon.currentStation}.`);
                }
            });

            // On drag, update the wagon's position to follow the pointer
            wagon.on('dragend', (pointer) => {
                const distanceFromLocomotive = Phaser.Math.Distance.Between(locomotive.x, locomotive.y, wagon.x, wagon.y);
                const couplingThreshold = 50;

                // Case 1: Attach only if at the same station as locomotive and within the threshold
                if (distanceFromLocomotive <= couplingThreshold && wagon.stationID === locomotive.currentStation) {
                    console.log("Attaching wagon to the locomotive...");
                    attachWagon(wagon);
                } else if (wagon.attachedToTrain) {
                    // Case 2: Decouple and place at the locomotive's current station
                    console.log("Entering CONDITION in DRAGEN to call DECOUPLE function")
                    decoupleWagon(wagon, stationPositions.find(s => s.id === locomotive.currentStation));
                } else {
                    // Case 3: Not attached, so return to its assigned station
                    returnWagonToStation(wagon);
                }

                updateWagonPositions();
            });


            // Helper function to return the wagon to its current station
            function returnWagonToStation(wagon) {
                const station = stationPositions.find(s => s.id === wagon.stationID); // Find the wagon's own station

                if (station) {
                    // Place the wagon back near its assigned station if not attached
                    const angle = Phaser.Math.Between(0, 360);
                    const distance = Phaser.Math.Between(40, 60);

                    const offsetX = Math.cos(Phaser.Math.DegToRad(angle)) * distance;
                    const offsetY = Math.sin(Phaser.Math.DegToRad(angle)) * distance;

                    wagon.x = station.x + offsetX;
                    wagon.y = station.y + offsetY;

                    console.log(`Wagon snapped back to its assigned station ${station.name} at X: ${wagon.x}, Y: ${wagon.y}`);
                }
            }

        });
    });










    // Decouple a wagon from the train and place it near the current station
    function decoupleWagon(wagon, stationData) {
        console.log("DECOUPLE WAGON called");
        console.log(`\n\n--- Decoupling Process Start ---`);
        console.log(`Decoupling wagon from locomotive. Wagon's current stationID: ${wagon.stationID}, Locomotive's stationID: ${locomotive.currentStation}`);

        // Remove the wagon from the attached wagons array
        attachedWagons = attachedWagons.filter(w => w !== wagon);
        wagon.attachedToTrain = false; // Mark as decoupled

        // Update the wagon's stationID to the locomotive's current station
        wagon.stationID = locomotive.currentStation;

        // Calculate a new position for the decoupled wagon around the destination station
        const angle = Phaser.Math.Between(0, 360);  // Random angle around the station
        const distance = Phaser.Math.Between(40, 60);  // Random distance from station center

        const offsetX = Math.cos(Phaser.Math.DegToRad(angle)) * distance;
        const offsetY = Math.sin(Phaser.Math.DegToRad(angle)) * distance;

        // Set the wagon's new position near the destination station
        wagon.x = locomotive.x + offsetX;
        wagon.y = locomotive.y + offsetY;

        stationData.wagonTypes.push(wagon.wagonType);

        // Add the wagon to the station's wagon array
        stationData.wagons.push(wagon);

        updateTrainGraphics();

        console.log("Before updateInfoPanel call:", stationData.wagons, stationData.wagonTypes);
        updateInfoPanel(stationData.name, stationData.wagonTypes);
        console.log("After updateInfoPanel call:", stationData.wagons, stationData.wagonTypes);

        console.log(`Wagon decoupled and positioned near station ${stationData.name}. New position: X=${wagon.x}, Y=${wagon.y}`);
        console.log(`Station ${stationData.name} now has ${stationData.wagons.length} wagons.`);
        console.log(`Updated wagons at station ${stationData.id}:`, stationData.wagons);
        console.log(`Updated wagon types at station ${stationData.id}:`, stationData.wagonTypes);
    }


    // Update the positions of wagons behind the locomotive
    function updateWagonPositions() {
        trainGraphics.clear();  // Clear previous lines before redrawing

        const offsetDistance = 25;  // Set the distance between each wagon

        attachedWagons.forEach((wagon, index) => {
            if (wagon.attachedToTrain) {
                // Recalculate the position of each wagon based on the current index
                const distance = offsetDistance * (index + 1);

                // Calculate the new position for each wagon relative to the locomotive
                const offsetX = Math.cos(locomotive.rotation) * distance;
                const offsetY = Math.sin(locomotive.rotation) * distance;

                // Move the wagon to its new position behind the locomotive
                wagon.x = locomotive.x - offsetX;
                wagon.y = locomotive.y - offsetY;
                wagon.rotation = locomotive.rotation; // Match the locomotive's rotation

                // console.log(`Updating attached wagon ${index + 1} position. New X: ${wagon.x}, New Y: ${wagon.y}`);

                // Draw a line between the locomotive and the first wagon
                if (index === 0) {
                    trainGraphics.lineStyle(4, 0x000000);
                    trainGraphics.beginPath();
                    trainGraphics.moveTo(locomotive.x, locomotive.y);
                    trainGraphics.lineTo(wagon.x, wagon.y);
                    trainGraphics.strokePath();
                }

                // Draw a line between consecutive wagons
                if (index > 0) {
                    const previousWagon = attachedWagons[index - 1];
                    trainGraphics.lineStyle(4, 0x000000);
                    trainGraphics.beginPath();
                    trainGraphics.moveTo(previousWagon.x, previousWagon.y);
                    trainGraphics.lineTo(wagon.x, wagon.y);
                    trainGraphics.strokePath();
                }
            }
        });
    }


    let currentTargetStation = null; // Track the target station
    let goButtonCircle = null; // Reference for the "Go" button circle
    let goButtonText = null; // Reference for the "Go" button text

    stations.forEach(station => {
        station.on('pointerdown', () => {
            console.log(`Clicked on station ${station.stationID}`);

            // Get data for the clicked station
            const clickedStationData = stationPositions.find(s => s.id === station.stationID);

            // Show station info in the info panel
            updateInfoPanel(clickedStationData.name, clickedStationData.wagonTypes);

            // Get the current station ID of the locomotive
            const currentStationId = locomotive.currentStation;

            // Check if the clicked station is connected and reachable from the locomotive's current station
            const currentStationData = stationPositions.find(s => s.id === currentStationId);
            const isReachable = currentStationData.connections.includes(clickedStationData.id);

            // Set current target station only if reachable
            if (isReachable) {
                currentTargetStation = clickedStationData;

                // Remove existing "Go" button circle and text if any
                if (goButtonCircle) goButtonCircle.destroy();
                if (goButtonText) goButtonText.destroy();

                // Create the "Go" button circle on the clicked station
                goButtonCircle = this.add.circle(station.x, station.y, 15, 0x4A3267, 1); // Same size and color as the station
                goButtonCircle.setInteractive();

                // Create the "Go" text in the center of the button
                goButtonText = this.add.text(station.x, station.y, 'Go', {
                    font: '16px Arial',
                    fill: '#FFFFFF'
                }).setOrigin(0.5);

                // Handle click on the "Go" button circle
                goButtonCircle.on('pointerdown', () => {
                    if (currentTargetStation) {
                        moveLocomotive.call(this, currentStationId, currentTargetStation.id); // Move the train

                        // Clean up: Remove "Go" button and text after the train starts moving
                        goButtonCircle.destroy();
                        goButtonText.destroy();
                        goButtonCircle = null;
                        goButtonText = null;
                    }
                });
            } else {
                console.log("This station is not reachable from the locomotive's current position.");
            }
        });
    });









}

function update() {
    //DEBUG: Log pointer coordinates on the map for testing
    //console.log(`Pointer X: ${this.input.mousePointer.worldX}, Pointer Y: ${this.input.mousePointer.worldY}`);
}
