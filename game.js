const config = {
    type: Phaser.AUTO,
    width: 800,
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
    // Create the map and center it
    const map = this.add.image(0, 0, 'map').setOrigin(0, 0);

    // Set world bounds to match the image size
    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);

    // Center the camera on the map
    this.cameras.main.centerOn(map.width * 0.5, map.height * 0.5);

    // Enable input or player movement for camera scrolling
    this.input.on('pointermove', function (pointer) {
        if (pointer.isDown) {
            // Move the camera by dragging
            this.cameras.main.scrollX -= (pointer.prevPosition.x - pointer.position.x);
            this.cameras.main.scrollY -= (pointer.prevPosition.y - pointer.position.y);
        }
    }, this);

    // If I will need to follow player sprite
    // const player = this.physics.add.sprite(map.width / 2, map.height / 2, 'player');
    // this.cameras.main.startFollow(player);

    const stations = [];
    let attachedWagons = [];
    let locomotive;

    const stationPositions = [
        { id: 1, x: 237, y: 215, name: "Весёлая лужайка", connections: [2], hasLocomotive: true, wagonType: null },
        { id: 2, x: 441, y: 154, name: "Кукурузное поле", connections: [1, 4], hasLocomotive: false, wagonType: 'train4' },
        { id: 3, x: 254, y: 504, name: "Солнечный берег", connections: [], hasLocomotive: false, wagonType: null },
        { id: 4, x: 700, y: 350, name: "Весёлый паравозик", connections: [2, 5, 6], hasLocomotive: false, wagonType: 'train3' },
        { id: 5, x: 900, y: 150, name: "Эверест", connections: [4], hasLocomotive: false, wagonType: 'train2' },
        { id: 6, x: 397, y: 366, name: "Зелёная станция", connections: [4, 7], hasLocomotive: false, wagonType: null },
        { id: 7, x: 450, y: 600, name: "Правый берег", connections: [6, 8], hasLocomotive: false, wagonType: null },
        { id: 8, x: 213, y: 737, name: "Заречье", connections: [7, 9], hasLocomotive: false, wagonType: null },
        { id: 9, x: 725, y: 636, name: "Поляна", connections: [8, 10], hasLocomotive: false, wagonType: 'train1' },
        { id: 10, x: 823, y: 817, name: "Дальний лес", connections: [9], hasLocomotive: false, wagonType: null }
    ];



    // Step 1: Drawing Stations
    // Step 1 updated: Drawing Stations and Locomotive
    stationPositions.forEach((stationData) => {
        let station = this.add.circle(stationData.x, stationData.y, 15, 0x4A3267, 0.5);
        station.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);

        station.stationID = stationData.id;
        stations.push(station);

        // Add station name
        this.add.text(stationData.x, stationData.y + 30, stationData.name, {
            font: '16px Arial',
            fill: '#000000'
        }).setOrigin(.5);

        // Add locomotive to station if it has one
        if (stationData.hasLocomotive) {
            locomotive = this.add.image(stationData.x, stationData.y, 'locomotive');
            locomotive.setScale(0.5);
            locomotive.setInteractive();

            locomotive.currentStation = stationData.id;  // Track current station
        }

        // Add wagon to the station if it has one

        if (stationData.wagonType) {
            let wagon = this.add.image(stationData.x, stationData.y, stationData.wagonType).setScale(0.5); // Adjust scale as needed
            wagon.setInteractive();

            // TODO Prevent the wagon from blocking the station's click event (doesn't work ) TODO
            wagon.on('pointerdown', (pointer, localX, localY, event) => {
                event.stopPropagation();
            });

            stationData.wagon = wagon;  // Store reference to the wagon directly in the station object
        }
    });
    const OFFSET = 15; // Offset distance from the station.

    // Step 2: Drawing Tracks as Lines Based on Connections
    stationPositions.forEach(stationData => {
        stationData.connections.forEach(connectedStationId => {
            const connectedStationData = stationPositions.find(s => s.id === connectedStationId);

            if (connectedStationData) {
                // Get positions of the current station and the connected station
                const stationA = { x: stationData.x, y: stationData.y };
                const stationB = { x: connectedStationData.x, y: connectedStationData.y };

                // Calculate the distance and angle between the stations
                const angle = Phaser.Math.Angle.Between(stationA.x, stationA.y, stationB.x, stationB.y);

                // Adjust the start and end points with the offset
                const startX = stationA.x + Math.cos(angle) * OFFSET;
                const startY = stationA.y + Math.sin(angle) * OFFSET;
                const endX = stationB.x - Math.cos(angle) * OFFSET;
                const endY = stationB.y - Math.sin(angle) * OFFSET;

                // Draw a simple line between the adjusted points
                let graphics = this.add.graphics();
                graphics.lineStyle(4, 0x645452, 0.4); //
                graphics.beginPath();
                graphics.moveTo(startX, startY);
                graphics.lineTo(endX, endY);
                graphics.strokePath();
            }
        });
    });

    // Step 3: Move Locomotive Function (UPDATE with rotation)
    function moveLocomotive(fromStationId, toStationId) {
        const fromStation = stationPositions.find(s => s.id === fromStationId);
        const toStation = stationPositions.find(s => s.id === toStationId);

        if (!fromStation || !toStation) {
            return;
        }

        // Calculate angle between stations for locomotive rotation
        const angle = Phaser.Math.Angle.Between(fromStation.x, fromStation.y, toStation.x, toStation.y);
        locomotive.setRotation(angle);

        // Move the locomotive using a tween
        this.tweens.add({
            targets: locomotive,
            x: toStation.x,
            y: toStation.y,
            duration: 2000,  // Time in milliseconds to complete movement
            ease: 'Power2',
            onUpdate: () => {
                // Continuously update wagon positions as the locomotive moves
                updateWagonPositions();
            },
            onComplete: () => {
                locomotive.currentStation = toStationId;  // Update the locomotive's current station

                // Check if there is a wagon at the station (from before or a decoupled wagon)
                if (toStation.wagon && !toStation.wagon.attachedToTrain) {
                    console.log("Wagon found at station: ", toStation.wagon);

                    // Offer the player the option to couple the wagon
                    showWagonModal.call(this, toStation.wagon, () => {
                        if (toStation.wagon) {
                            attachWagon(toStation.wagon);  // Ensure wagon is not null before attaching
                            toStation.wagon = null;  // Remove the wagon from the station since it's now attached
                        } else {
                            console.log("No wagon found to attach.");
                        }
                    }, () => {
                        // If the player chooses to leave the wagon
                        console.log("Wagon left at the station.");
                    });
                }

                updateWagonPositions();  // Final update of wagon positions
            }
        });
    }


    // Function to attach a wagon (player) to the train
    //TODO make wagon draggable AFTER (tmp??) attaching
    const attachWagon = (wagon) => {
        attachedWagons.push(wagon);
        wagon.attachedToTrain = true;  // Flag to indicate the wagon is part of the train

        // Set the wagon as draggable and interactive
        wagon.setInteractive();
        this.input.setDraggable(wagon);

        // Add drag start, drag, and drag end events
        wagon.on('dragstart', (pointer) => {
            console.log("Dragging started for wagon");
        });

        wagon.on('drag', (pointer, dragX, dragY) => {
            // Set the new position of the wagon during dragging
            wagon.x = dragX;
            wagon.y = dragY;
        });

        wagon.on('dragend', (pointer) => {
            // Check the distance from the locomotive to the wagon
            const distanceFromLocomotive = Phaser.Math.Distance.Between(
                locomotive.x,
                locomotive.y,
                wagon.x,
                wagon.y
            );

            // Set a threshold for decoupling (e.g., 150 pixels)
            const decoupleThreshold = 10;

            if (distanceFromLocomotive > decoupleThreshold) {
                // Decouple the wagon if it's dragged far enough
                decoupleWagon(wagon);
            } else {
                // If not far enough, reset the wagon position back to the train
                updateWagonPositions();
            }
        });

        console.log("Wagon attached and draggable!");
    }

    function decoupleWagon(wagon) {
        console.log("Wagon decoupled!");

        // Remove the wagon from the attached wagons array
        attachedWagons = attachedWagons.filter(w => w !== wagon);
        wagon.attachedToTrain = false;  // Mark it as decoupled

        // Change color to indicate the wagon is decoupled (optional visual indicator)
        wagon.setTint(0xff0000);

        // Get the current station of the locomotive
        const currentStationId = locomotive.currentStation;
        const currentStation = stationPositions.find(station => station.id === currentStationId);

        if (currentStation) {
            // Move the wagon to a position near the station (apply an offset)
            const offsetX = 50;
            const offsetY = 30;
            wagon.x = currentStation.x + offsetX;
            wagon.y = currentStation.y + offsetY;

            // Optionally, reset the tint or make it interactable again
            wagon.clearTint();

            // Track the wagon as being left at this station (use an array to store multiple wagons)
            if (!currentStation.wagons) {
                currentStation.wagons = [];
            }

            // Check if the wagon is already in the station's wagons array
            if (!currentStation.wagons.includes(wagon)) {
                currentStation.wagons.push(wagon);  // Add the wagon to the station's wagons array only if not already added
            }
            console.log("CHECK uncoupled wagon", currentStation.wagons);

            console.log(`Wagon moved near station: ${currentStation.name}`);
        } else {
            console.log("Error: Locomotive's current station not found.");
        }

        // Update the positions of the remaining wagons to maintain the train structure
        updateWagonPositions();
    }




    // Update wagon positions behind the locomotive
    const updateWagonPositions = () => {
        const offsetDistance = 70;  // Distance between each wagon

        attachedWagons.forEach((wagon, index) => {
            if (wagon.attachedToTrain) {
                const distance = offsetDistance * (index + 1);

                // Calculate the offset behind the locomotive based on its current rotation
                const offsetX = Math.cos(locomotive.rotation) * distance;
                const offsetY = Math.sin(locomotive.rotation) * distance;

                // Directly set the position of each wagon to follow the locomotive
                wagon.x = locomotive.x - offsetX;
                wagon.y = locomotive.y - offsetY;
                wagon.rotation = locomotive.rotation;  // Ensure the wagon faces the same direction
            }
        });
    }

    // Example Interaction to Move Locomotive Between Stations
    stations.forEach(station => {
        station.on('pointerdown', () => {
            console.log(`Clicked on station ${station.stationID}`);

            const currentStationId = locomotive.currentStation;
            const currentStationData = stationPositions.find(s => s.id === currentStationId);

            // Move locomotive to the clicked station if it's connected
            if (currentStationData.connections.includes(station.stationID)) {
                moveLocomotive.call(this, currentStationId, station.stationID);
            } else {
                console.log("Locomotive can only move to connected stations.");
            }
        });
    });

    // Independent wagon click interaction (each wagon represents a player)
    attachedWagons.forEach((wagon) => {
        wagon.setInteractive();
        wagon.on('pointerdown', () => {
            console.log(`Player wagon clicked! Perform action for player: ${wagon.playerID}`);
            // CUSTOM INTERACTION
        });
    });

    // Function to show a modal window with buttons for coupling/uncoupling the wagon
    function showWagonModal(wagon, onAttach, onLeave) {
        // Create a semi-transparent background for the modal
        const modalBackground = this.add.graphics();
        modalBackground.fillStyle(0x000000, 0.5);
        modalBackground.fillRect(200, 150, 400, 300);

        // Create text for the modal
        const modalText = this.add.text(400, 200, 'Что делать c вагоном?', {
            font: '24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // couple
        const coupleButton = this.add.text(250, 300, 'Прицепить', {
            font: '20px Arial',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setInteractive();

        coupleButton.on('pointerdown', () => {
            onAttach(); // Call the onAttach function to attach the wagon
            updateWagonPositions();
            closeModal(); // Close the modal
        });

        // Create the 'Leave' button
        const leaveButton = this.add.text(450, 300, 'Оставить', {
            font: '20px Arial',
            fill: '#ff0000',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setInteractive();

        leaveButton.on('pointerdown', () => {
            onLeave(); // Call the onLeave function to leave the wagon
            closeModal(); // Close the modal
        });

        // Function to close the modal and remove the elements
        function closeModal() {
            modalBackground.destroy();
            modalText.destroy();
            coupleButton.destroy();
            leaveButton.destroy();
        }
    }



}



function update() {

    //DEBUG. TO identify points coordinates on the map
    //console.log(`Pointer X: ${this.input.mousePointer.worldX}, Pointer Y: ${this.input.mousePointer.worldY}`);
}
