const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
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
    this.load.image('locomotive', 'images/locomotive.png');
    this.load.image('train1', 'images/train-1.png');
    this.load.image('train2', 'images/train-2.png');
    this.load.image('train3', 'images/train-3.png');
    this.load.image('train4', 'images/train-4.png');
}

function create() {
    // Create and display the map, setting it at (0, 0) and aligning its origin to the top left
    const map = this.add.image(0, 0, 'map').setOrigin(0, 0);

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

    const stations = []; // Array to store all station objects
    let attachedWagons = []; // Array to store wagons attached to the locomotive
    let locomotive; // Store the locomotive object

    // Define station positions, connections, and which stations have wagons or locomotives
    const stationPositions = [
        { id: 1, x: 237, y: 215, name: "Весёлая лужайка", connections: [2], hasLocomotive: true, wagonType: null },
        { id: 2, x: 441, y: 154, name: "Кукурузное поле", connections: [1, 4], hasLocomotive: false, wagonType: 'train4' },
        { id: 3, x: 254, y: 504, name: "Солнечный берег", connections: [], hasLocomotive: false, wagonType: null },
        { id: 4, x: 700, y: 350, name: "Весёлый паровозик", connections: [2, 5, 6], hasLocomotive: false, wagonType: 'train3' },
        { id: 5, x: 900, y: 150, name: "Эверест", connections: [4], hasLocomotive: false, wagonType: 'train2' },
        { id: 6, x: 397, y: 366, name: "Зелёная станция", connections: [4, 7], hasLocomotive: false, wagonType: null },
        { id: 7, x: 450, y: 600, name: "Правый берег", connections: [6, 8], hasLocomotive: false, wagonType: null },
        { id: 8, x: 213, y: 737, name: "Заречье", connections: [7, 9], hasLocomotive: false, wagonType: null },
        { id: 9, x: 725, y: 636, name: "Поляна", connections: [8, 10], hasLocomotive: false, wagonType: 'train1' },
        { id: 10, x: 823, y: 817, name: "Дальний лес", connections: [9], hasLocomotive: false, wagonType: null }
    ];

    // Step 1: Draw the stations on the map
    stationPositions.forEach((stationData) => {
        let station = this.add.circle(stationData.x, stationData.y, 15, 0x4A3267, 0.5); // Add station circle
        station.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains); // Make station clickable

        station.stationID = stationData.id; // Assign the station's ID
        stations.push(station); // Add station to the array

        // Add station name text below the station
        this.add.text(stationData.x, stationData.y + 30, stationData.name, {
            font: '16px Arial',
            fill: '#000000'
        }).setOrigin(.5);

        // Add locomotive if the station has one
        if (stationData.hasLocomotive) {
            locomotive = this.add.image(stationData.x, stationData.y, 'locomotive');
            locomotive.setScale(0.5);
            locomotive.setInteractive();
            locomotive.currentStation = stationData.id; // Track which station the locomotive is at
        }

        // Initialize wagons array at the station
        stationData.wagons = [];

        // Add a wagon to the station if it has one
        if (stationData.wagonType) {
            let wagon = this.add.image(stationData.x, stationData.y, stationData.wagonType).setScale(0.5); // Add and scale the wagon
            wagon.setInteractive(); // Make the wagon clickable

            stationData.wagons.push(wagon); // Store the wagon in the station's array

            // TODO Doesn't work.  Prevent the wagon from blocking station clicks TODO
            wagon.on('pointerdown', (pointer, localX, localY, event) => {
                event.stopPropagation(); // Prevent event bubbling to the station
            });

            stationData.wagon = wagon; // Store wagon reference in the station data
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

    function moveLocomotive(fromStationId, toStationId) {
        const fromStation = stationPositions.find(s => s.id === fromStationId); // Get current station
        const toStation = stationPositions.find(s => s.id === toStationId); // Get destination station

        if (!fromStation || !toStation) {
            return;
        }

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
                locomotive.currentStation = toStationId; // Update the locomotive's current station

                // Check if the destination station has wagons
                if (toStation.wagons && toStation.wagons.length > 0) {
                    console.log("Wagons found at station: ", toStation.wagons);

                    // Show a modal to allow the player to couple a wagon
                    showWagonModal.call(this, toStation.wagons, (selectedWagon) => {
                        if (selectedWagon) {
                            attachWagon(selectedWagon);  // Attach the selected wagon to the train
                            toStation.wagons = toStation.wagons.filter(w => w !== selectedWagon);  // Remove wagon from station
                        } else {
                            console.log("No wagon selected to attach.");
                        }
                    }, () => {
                        console.log("Wagon left at the station.");
                    });
                }

                updateWagonPositions();  // Final update of wagon positions
            }
        });
    }

    // Attach a wagon to the train. This allows the player to drag it
    const attachWagon = (wagon) => {
        attachedWagons.push(wagon); // Add the wagon to the attached wagons array
        wagon.attachedToTrain = true;  // Mark wagon as attached

        wagon.setInteractive(); // Make the wagon clickable and draggable
        this.input.setDraggable(wagon); // Enable dragging

        // Handle drag events
        wagon.on('dragstart', (pointer) => {
            console.log("Dragging started for wagon");
        });

        wagon.on('drag', (pointer, dragX, dragY) => {
            wagon.x = dragX;
            wagon.y = dragY;
        });

        wagon.on('dragend', (pointer) => {
            const distanceFromLocomotive = Phaser.Math.Distance.Between(
                locomotive.x, locomotive.y, wagon.x, wagon.y
            );

            const decoupleThreshold = 10; // Decoupling distance 

            if (distanceFromLocomotive > decoupleThreshold) {
                decoupleWagon(wagon); // Decouple the wagon if it's dragged far away
            } else {
                updateWagonPositions(); // Reset position if it's not far enough
            }
        });

        console.log("Wagon attached and draggable!");
    }

    // Detach a wagon from the train and place it near the station
    function decoupleWagon(wagon) {
        console.log("Wagon decoupled!");

        attachedWagons = attachedWagons.filter(w => w !== wagon); // Remove from attached wagons
        wagon.attachedToTrain = false; // Mark as decoupled

        // Get the station where the locomotive is currently located
        const currentStationId = locomotive.currentStation;
        const currentStation = stationPositions.find(station => station.id === currentStationId);

        if (currentStation) {
            const index = currentStation.wagons.length; // Determine offset for wagons
            const offsetX = 50 + (index * 30);  // Offset wagons by X
            const offsetY = 30 + (index * 20);  // Offset wagons by Y

            wagon.x = currentStation.x + offsetX; // Set wagon's new position X
            wagon.y = currentStation.y + offsetY; // Set wagon's new position Y
            wagon.clearTint();

            // Add wagon to the station's wagon list
            if (!currentStation.wagons.includes(wagon)) {
                currentStation.wagons.push(wagon);
            }

            console.log(`Wagon moved near station: ${currentStation.name}`);
        }

        updateWagonPositions(); // Update positions of other wagons
    }

    // Update the positions of wagons behind the locomotive
    const updateWagonPositions = () => {
        const offsetDistance = 70;  // Set the distance between each wagon

        attachedWagons.forEach((wagon, index) => {
            if (wagon.attachedToTrain) {
                const distance = offsetDistance * (index + 1);

                // Calculate the new position for each wagon relative to the locomotive
                const offsetX = Math.cos(locomotive.rotation) * distance;
                const offsetY = Math.sin(locomotive.rotation) * distance;

                wagon.x = locomotive.x - offsetX; // Set the X position
                wagon.y = locomotive.y - offsetY; // Set the Y position
                wagon.rotation = locomotive.rotation; // Match the locomotive's rotation
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

    // Function to show a modal window for selecting wagons
    function showWagonModal(wagons, onAttach, onLeave) {
        console.log("Showing modal with wagons:", wagons);

        const modalBackground = this.add.graphics();
        modalBackground.fillStyle(0x000000, 0.5);
        modalBackground.fillRect(200, 150, 400, 300);

        // Add modal text
        const modalText = this.add.text(400, 200, 'Выберите вагон для действия:', {
            font: '24px Arial', fill: '#ffffff'
        }).setOrigin(0.5); // Center the text

        let selectedWagon = null; // Track the selected wagon

        const modalWagonImages = []; // Store wagon images for later destruction

        const startX = 250;
        const startY = 250;
        const spacingX = 80;

        // Display each wagon available at the station
        if (Array.isArray(wagons) && wagons.length > 0) {
            wagons.forEach((wagon, index) => {
                const wagonImage = this.add.image(startX + index * spacingX, startY, wagon.texture.key).setScale(0.4);

                modalWagonImages.push(wagonImage); // Add image to the modal's array

                wagonImage.setInteractive(); // Make each wagon image clickable
                wagonImage.on('pointerdown', () => {
                    if (selectedWagon) {
                        selectedWagon.clearTint(); // Remove previous selection highlight
                    }
                    wagonImage.setTint(0x00ff00); // Highlight selected wagon
                    selectedWagon = wagon; // Set selected wagon
                });
            });
        }

        // Create 'Attach' button for coupling wagons
        const coupleButton = this.add.text(250, 300, 'Прицепить', {
            font: '20px Arial', fill: '#00ff00', backgroundColor: '#000000', padding: { x: 10, y: 5 }
        }).setInteractive();

        coupleButton.on('pointerdown', () => {
            if (selectedWagon) {
                onAttach(selectedWagon); // Attach selected wagon
                updateWagonPositions(); // Update positions after coupling
                closeModal(); // Close the modal
            }
        });

        // Create 'Leave' button for leaving wagons
        const leaveButton = this.add.text(450, 300, 'Оставить', {
            font: '20px Arial', fill: '#ff0000', backgroundColor: '#000000', padding: { x: 10, y: 5 }
        }).setInteractive();

        leaveButton.on('pointerdown', () => {
            if (selectedWagon) {
                onLeave(selectedWagon); // Leave the wagon
                closeModal(); // Close the modal
            }
        });

        // Function to close the modal and destroy its elements
        function closeModal() {
            modalBackground.destroy();
            modalText.destroy();
            coupleButton.destroy();
            leaveButton.destroy();

            modalWagonImages.forEach((wagonImage) => { // Destroy all modal wagon images
                wagonImage.destroy();
            });
        }
    }
}

function update() {
    // DEBUG: Log pointer coordinates on the map for testing
    //console.log(`Pointer X: ${this.input.mousePointer.worldX}, Pointer Y: ${this.input.mousePointer.worldY}`);
}
