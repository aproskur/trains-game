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
    //this.load.image('train1', 'images/train-1.png');
    // this.load.image('train2', 'images/train-2.png');
    // this.load.image('train3', 'images/train-3.png');
    // this.load.image('train4', 'images/train-4.png');
}

let trainGraphics;

function create() {
    trainGraphics = this.add.graphics();

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

            // We want to skip certain angles (e.g., avoid bottom side where station names are located)
            const avoidAngleStart = Phaser.Math.DegToRad(120);  // Start of the angle to avoid (below the station)
            const avoidAngleEnd = Phaser.Math.DegToRad(240);    // End of the angle to avoid

            stationData.wagonTypes.forEach((wagonType, index) => {
                let wagonColor = wagonColors[wagonType] || 0xFFFFFF; // Default to white 
                // Calculate the angle for each wagon to position them around the station
                let angle = Phaser.Math.DegToRad(angleIncrement * index);  // Convert degrees to radians

                // If the angle is within the range to avoid, adjust it
                if (angle >= avoidAngleStart && angle <= avoidAngleEnd) {
                    angle += Phaser.Math.DegToRad(angleIncrement);  // Adjust the angle to skip the "name" zone
                }

                const offsetX = Math.cos(angle) * offsetDistance;
                const offsetY = Math.sin(angle) * offsetDistance;

                // Create the wagon as a smaller circle and position it outside the station
                let wagon = this.add.circle(stationData.x + offsetX, stationData.y + offsetY, wagonRadius, wagonColor);
                wagon.setInteractive();  // Make the wagon clickable
                wagon.setDepth(1);  // Ensure wagons are above rails and other elements

                // Save the wagon's initial position
                wagon.originalX = wagon.x;
                wagon.originalY = wagon.y;

                wagon.stationID = stationData.id; // Associate the wagon with the station by ID

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

        console.log(`Moving locomotive from station ${fromStationId} to station ${toStationId}`);

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

        // Re-enable dragging after the wagon is coupled to the train
        this.input.setDraggable(wagon, true);  // Allow dragging again after it's attached

        // Remove the wagon from the station's wagon list since it's attached to the train
        const station = stationPositions.find(s => s.id === wagon.stationID);
        if (station) {
            station.wagons = station.wagons.filter(w => w !== wagon);
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
                    wagon.attachedToTrain = false;  // Mark wagon as decoupled

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
        console.log(`\n\n--- Decoupling Process Start ---`);
        console.log(`Decoupling wagon from locomotive. Wagon's current stationID: ${wagon.stationID}, Locomotive's stationID: ${locomotive.currentStation}`);

        // Remove the wagon from the attached wagons array
        attachedWagons = attachedWagons.filter(w => w !== wagon);
        wagon.attachedToTrain = false; // Mark as decoupled

        // **Update the wagon's stationID** to the locomotive's current station
        wagon.stationID = locomotive.currentStation;
        console.log(`Wagon's stationID updated to locomotive's stationID: ${locomotive.currentStation}`);

        // Calculate a new position for the decoupled wagon around the destination station
        const angle = Phaser.Math.Between(0, 360);  // Random angle around the station
        const distance = Phaser.Math.Between(40, 60);  // Random distance from station center (adjust as needed)

        const offsetX = Math.cos(Phaser.Math.DegToRad(angle)) * distance;
        const offsetY = Math.sin(Phaser.Math.DegToRad(angle)) * distance;

        // Set the wagon's new position near the destination station
        wagon.x = locomotive.x + offsetX;
        wagon.y = locomotive.y + offsetY;

        console.log(`Wagon decoupled and positioned near station ${stationData.name}. New position: X=${wagon.x}, Y=${wagon.y}`);

        // Add the decoupled wagon to the destination station's wagons array
        stationData.wagons.push(wagon);
        console.log(`Wagon added to station ${stationData.name}. Station now has ${stationData.wagons.length} wagons.`);

        // After decoupling, update wagon positions
        updateWagonPositions();
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

                console.log(`Updating attached wagon ${index + 1} position. New X: ${wagon.x}, New Y: ${wagon.y}`);

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


    // Example interaction: Move the locomotive when a station is clicked
    stations.forEach(station => {
        station.on('pointerdown', () => {
            console.log(`Clicked on station ${station.stationID}`);

            const currentStationId = locomotive.currentStation; // Get current station
            const currentStationData = stationPositions.find(s => s.id === currentStationId);

            // Move locomotive if clicked station is connected
            if (currentStationData.connections.includes(station.stationID)) {
                moveLocomotive.call(this, currentStationId, station.stationID); // Move the train
            } else {
                console.log("Locomotive can only move to connected stations.");
            }
        });
    });




    // --- Info Panel (Fixed Position) ---
    // Create a fixed background for the info panel (right 30% of canvas)
    const infoPanelBackground = this.add.graphics();
    infoPanelBackground.fillStyle(0xF4F4F4, 1);  // Light gray background for the info panel
    infoPanelBackground.fillRect(mapWidth, 0, infoPanelWidth, config.height);  // Right 30% of canvas

    // Add text for displaying station information
    const infoTextTitle = this.add.text(mapWidth + 20, 20, 'Station Info:', { font: '24px Arial', fill: '#000' });
    const stationNameText = this.add.text(mapWidth + 20, 60, 'Station: N/A', { font: '18px Arial', fill: '#000' });
    const wagonText = this.add.text(mapWidth + 20, 100, 'Wagons: N/A', { font: '18px Arial', fill: '#000' });

    // Fix the info panel position to make sure it doesn't scroll
    infoPanelBackground.setScrollFactor(0);  // Info panel stays static
    infoTextTitle.setScrollFactor(0);
    stationNameText.setScrollFactor(0);
    wagonText.setScrollFactor(0);

    // Function to update the info panel when a station is clicked
    function updateInfoPanel(stationName, wagons) {
        stationNameText.setText(`Station: ${stationName}`);
        wagonText.setText(`Wagons: ${wagons.join(', ')}`);
    }
}

function update() {
    //DEBUG: Log pointer coordinates on the map for testing
    //console.log(`Pointer X: ${this.input.mousePointer.worldX}, Pointer Y: ${this.input.mousePointer.worldY}`);
}
