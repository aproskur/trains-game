const config = {
    type: Phaser.AUTO,
    width: 1250,
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
    this.load.image('guinea-map', 'images/guinea-map.jpg');
}

let trainGraphics;
let sidebarWagonGraphics;
let sidebarTrainGraphics;
let sidebarVisible = true;

function drawStar(graphics, x, y, radius, color, alpha = 0.1, lineWidth = 2) {
    graphics.lineStyle(lineWidth, color, alpha);
    graphics.fillStyle(color, alpha);

    const numPoints = 5;
    const outerRadius = radius;
    const innerRadius = radius / 2;

    graphics.beginPath();
    // Starting angle at -Math.PI / 2 to ensure the top point is exactly at 0 degrees
    for (let i = 0; i < numPoints * 2; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / numPoints;
        const dist = i % 2 === 0 ? outerRadius : innerRadius;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        if (i === 0) {
            graphics.moveTo(px, py); // Start path at the first point
        } else {
            graphics.lineTo(px, py); // Draw lines to subsequent points
        }
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
}

function isClickOutsideSidebar(pointer) {
    const sidebarWidth = config.width * 0.3;
    return pointer.x < config.width - sidebarWidth; // Click is outside sidebar area if x < sidebar left edge
}

function create() {
    trainGraphics = this.add.graphics();
    sidebarWagonGraphics = this.add.graphics();
    sidebarWagonGraphics.setScrollFactor(0);
    sidebarTrainGraphics = this.add.graphics();
    sidebarTrainGraphics.setScrollFactor(0);





    // ----- ZOOM IN and ZOOM out ------
    this.input.enabled = true;
    let zoomLevel = 1;
    const maxZoom = 2;
    const minZoom = 1;

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (deltaY > 0) {
            zoomLevel = Math.max(minZoom, zoomLevel - 0.1);
        } else {
            zoomLevel = Math.min(maxZoom, zoomLevel + 0.1);
        }
        this.cameras.main.setZoom(zoomLevel);
        updateSidebarSize();
    });


    const mapWidth = config.width;  // 100% of canvas for the map
    const sidebarWidth = 0.3 * config.width;  // 30% of canvas for the info panel
    const sidebarX = config.width - sidebarWidth;

    // --- Map Layer ---
    const mapLayer = this.add.layer();  // Layer for the map elements. Just visually grouping elements 
    // Create and display the map inside the map layer
    const map = this.add.image(0, 0, 'guinea-map').setOrigin(0, 0);
    const canvasAspectRatio = config.width / config.height;
    const mapAspectRatio = map.width / map.height;
    if (canvasAspectRatio > mapAspectRatio) {
        // Canvas is wider than the map aspect ratio
        map.setDisplaySize(config.width, config.width / mapAspectRatio);
    } else {
        // Canvas is taller than the map aspect ratio
        map.setDisplaySize(config.height * mapAspectRatio, config.height);
    }

    // Center the map so it fills the canvas and stays balanced if cropped
    map.setPosition((config.width - map.displayWidth) / 2, (config.height - map.displayHeight) / 2);


    // Set world boundaries to match the map size
    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height); // Camera bounds match the map

    // Enable dragging to move the camera
    this.input.on('pointermove', function (pointer) {
        if (pointer.isDown) {
            // Adjust camera scroll based on pointer movement
            this.cameras.main.scrollX -= (pointer.prevPosition.x - pointer.position.x);
            this.cameras.main.scrollY -= (pointer.prevPosition.y - pointer.position.y);
        }
    }, this);

    const wagonColors = {
        'train1': 0x2ECC71,  // Bright Green 
        'train2': 0xF1C40F,  // Bright Yellow 
        'train3': 0x9B59B6,  // Bright Purple 
        'train4': 0xE67E22   // Bright Orange 
    };

    const stations = []; // Array to store all station objects
    let attachedWagons = []; // Array to store wagons attached to the locomotive
    let locomotive;

    // Define station positions, connections, and which stations have wagons or locomotives
    const stationPositions = [
        { id: 1, x: 315, y: 131, name: "14", connections: [2], hasLocomotive: true, wagonTypes: ['train1', 'train1', 'train1', 'train2', 'train2'] },
        { id: 2, x: 502, y: 109, name: "13", connections: [1, 4], hasLocomotive: false, wagonTypes: ['train4', 'train4', 'train4', 'train4', 'train4', 'train4', 'train1', 'train1', 'train1'] },
        { id: 3, x: 344, y: 374, name: "24", connections: [], hasLocomotive: false, wagonTypes: [] },
        { id: 4, x: 567, y: 203, name: "2", connections: [2, 5, 6], hasLocomotive: false, wagonTypes: ['train3', 'train3', 'train1'] },
        { id: 5, x: 730, y: 221, name: "7", connections: [4], hasLocomotive: false, wagonTypes: ['train2', 'train2', 'train3'] },
        { id: 6, x: 496, y: 259, name: "19", connections: [4, 7], hasLocomotive: false, wagonTypes: [] },
        { id: 7, x: 456, y: 234, name: "16", connections: [6, 8], hasLocomotive: false, wagonTypes: [] },
        { id: 8, x: 381, y: 263, name: "23", connections: [7, 9], hasLocomotive: false, wagonTypes: [] },
        { id: 9, x: 455, y: 354, name: "25", connections: [8, 10], hasLocomotive: false, wagonTypes: ['train1'] },
        { id: 10, x: 601, y: 447, name: "29", connections: [9], hasLocomotive: false, wagonTypes: [] }
    ];


    // --- SIDEBAR ---
    const sidebarLayer = this.add.layer();
    sidebarLayer.setDepth(100);
    sidebarLayer.setVisible(false);

    const sidebarBackground = this.add.graphics();
    sidebarBackground.fillStyle(0xF4F4F4, 1);
    sidebarBackground.fillRect(config.width - sidebarWidth, 0, sidebarWidth, config.height);  // Right 30% of canvas
    sidebarBackground.setDepth(100);
    sidebarLayer.add(sidebarBackground);
    sidebarLayer.add(sidebarTrainGraphics);

    // sidebarBackground.setVisible(false);


    // Function to dynamically update Info Panel size
    const updateSidebarSize = () => {
        const sidebarWidth = config.width * 0.3; // 30% of canvas width
        sidebarBackground.clear();
        sidebarBackground.fillStyle(0xF4F4F4, 1);
        sidebarBackground.fillRect(config.width - sidebarWidth, 0, sidebarWidth, config.height); // Draw panel on the right
    };


    // Add text for displaying station information
    const infoTextTitle = this.add.text(sidebarX + 20, 20, 'Информация:', { font: '24px Arial', fill: '#000' });
    const stationNameText = this.add.text(sidebarX + 20, 60, 'Станция: Выберите станцию', { font: '18px Arial', fill: '#000' });
    const wagonText = this.add.text(sidebarX + 20, 100, 'Вагоны: информация отсутствует', { font: '18px Arial', fill: '#000' });
    const trainLabel = this.add.text(
        sidebarX + 20,
        400,
        'Конфигурация поезда:',
        { font: '18px Arial', fill: '#000' }
    );
    // Set scroll factors for all sidebar elements to keep them in place
    [infoTextTitle, stationNameText, wagonText, trainLabel].forEach(text => {
        text.setScrollFactor(0);
        text.setDepth(100);
        sidebarLayer.add(text); // all text labels added to sidebar
    });





    // Sidebar display function to set visibility and depth
    // Set up the pointerdown event listener once in the create function or after sidebar initialization
    this.input.on('pointerdown', (pointer) => {
        if (sidebarVisible && isClickOutsideSidebar(pointer)) {
            hideSidebar();
        }
    });

    const showSidebar = () => {
        console.log("Showing sidebar");
        sidebarVisible = true;
        sidebarLayer.setVisible(true);
        sidebarLayer.setDepth(100);

        sidebarLayer.getChildren().forEach((child, index) => {
            child.setVisible(true).setDepth(100);
            console.log(`Child ${index} visibility after setting: ${child.visible}`);
        });

        console.log("Sidebar visibility after showSidebar():", sidebarLayer.visible);
    };

    const hideSidebar = () => {
        console.log("Hiding sidebar");
        sidebarVisible = false;
        sidebarLayer.setVisible(false);
    };



    // Hide sidebar initially
    hideSidebar();


    let draggableWagonSidebarGraphics = [];

    // Function to update the info panel when a station is clicked
    // Update the info panel function
    // Modify updateSidebar to ensure drawing
    const updateSidebar = (stationId, stationName, wagons) => {
        console.log("updateSidebar called for station:", stationName);  // Debugging log

        stationNameText.setText(`Станция: ${stationName}`);
        sidebarWagonGraphics.clear(); // Clear only the station graphics
        draggableWagonSidebarGraphics.forEach(graphic => graphic.destroy()); // Clear previous draggable graphics
        draggableWagonSidebarGraphics = []; // Reset the array for new graphics

        const startX = sidebarX + 40;  // X offset for station wagon circles
        let offsetY = 150;             // Y offset for station wagons
        const circleRadius = 10;       // Radius for each station wagon circle
        const circleSpacing = 25;      // Spacing between station wagon circles

        // Display title for wagons
        if (wagons.length === 0) {
            wagonText.setText('Вагоны: сейчас на станции нет вагонов');
        } else {
            wagonText.setText('Вагоны:');
            wagonText.setPosition(sidebarX + 20, 110);

            // Draw each wagon type as a circle with color
            wagons.forEach((wagonType, index) => {
                const wagonColor = wagonColors[wagonType] || 0xFFFFFF;
                const wagonCircle = this.add.circle(startX, offsetY + (index * circleSpacing), circleRadius, wagonColor);
                wagonCircle.setInteractive();
                wagonCircle.setScrollFactor(0);
                wagonCircle.setDepth(100);
                sidebarLayer.add(wagonCircle);  // Add each wagon circle to sidebarLayer
                draggableWagonSidebarGraphics.push(wagonCircle);

                console.log("Wagon initialized for dragging:", wagonType);

                // Enable dragging for the wagon circles
                this.input.setDraggable(wagonCircle);

                // Dragging event
                wagonCircle.on('drag', (pointer, dragX, dragY) => {
                    wagonCircle.x = dragX;
                    wagonCircle.y = dragY;
                });

                // Drag end event to check if dropped near the locomotive
                wagonCircle.on('dragend', (pointer) => {
                    const locomotiveX = sidebarX + 20;
                    const locomotiveY = 430;
                    const distanceToLocomotive = Phaser.Math.Distance.Between(
                        locomotiveX,
                        locomotiveY,
                        pointer.worldX,
                        pointer.worldY
                    );

                    const couplingThreshold = 50;
                    if (distanceToLocomotive <= couplingThreshold) {
                        attachWagon(wagonType, stationId);
                        wagonCircle.destroy();
                        updateSidebarTrainGraphics();  // Update train sidebar graphics
                    } else {
                        // Return wagon to original position
                        wagonCircle.x = startX;
                        wagonCircle.y = offsetY + (index * circleSpacing);
                    }
                });
            });
        }

        // Ensure the sidebar is visible after update
        showSidebar();

        // Remove any previous pointerdown listener to avoid duplicates
        //this.input.off('pointerdown', hideSidebarOnOutsideClick);
        //  this.input.on('pointerdown', hideSidebarOnOutsideClick);
    };




    // Helper function for outside click to hide the sidebar
    const hideSidebarOnOutsideClick = (pointer) => {
        if (pointer.x < mapWidth && sidebarVisible) {
            hideSidebar();
        }
    };





    // This draws train on SIDEBAR
    function updateSidebarTrainGraphics() {
        sidebarTrainGraphics.clear();
        const startX = sidebarX + 20;
        const startY = 430;
        const locomotiveWidth = 40;
        const locomotiveHeight = 20;
        const circleRadius = 10;
        const spacing = 1;

        // Draw the locomotive as a rectangle in the sidebar
        sidebarTrainGraphics.fillStyle(0xE84393, 1);
        sidebarTrainGraphics.fillRect(startX, startY, locomotiveWidth, locomotiveHeight);

        // Draw each attached wagon as a circle next to the locomotive in the sidebar
        attachedWagons.forEach((wagon, index) => {
            const wagonColor = wagonColors[wagon.wagonType] || 0xFFFFFF;
            const xPos = startX + locomotiveWidth + (index + 1) * (circleRadius * 2 + spacing);
            sidebarTrainGraphics.fillStyle(wagonColor, 1);
            sidebarTrainGraphics.fillCircle(xPos, startY + locomotiveHeight / 2, circleRadius);
        });

        sidebarLayer.add(sidebarTrainGraphics); // Add the train graphics to sidebar layer
        sidebarTrainGraphics.setDepth(100); // Ensure it appears on top
    }




    // Create a bar chart for each station's wagons
    const createStationBarChart = (stationData) => {
        const barChart = this.add.graphics();
        const stationX = stationData.x;
        const stationY = stationData.y - 30; // Position above the station

        const barWidth = 20; // Width of each bar
        const spacing = 20; // Space between each bar
        const baseHeight = 5; // Base height per wagon to scale the bars
        const maxWagonHeight = 100; // Maximum height cap for visual clarity

        // Count each wagon type
        const wagonTypeCounts = stationData.wagonTypes.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // Center the bar chart above the station
        let offsetX = stationX - ((Object.keys(wagonTypeCounts).length - 1) * spacing) / 2;

        Object.entries(wagonTypeCounts).forEach(([wagonType, count]) => {
            const wagonColor = wagonColors[wagonType] || 0xFFFFFF;
            const barHeight = Math.min(count * baseHeight, maxWagonHeight); // Scale height by count, cap at max height

            // Draw each bar with height representing the count
            barChart.fillStyle(wagonColor, 1);
            barChart.fillRect(offsetX, stationY - barHeight, barWidth, barHeight);

            // Add the count text inside the bar, centered
            this.add.text(offsetX + barWidth / 2, stationY - barHeight / 2, count, {
                font: '12px Arial',
                fill: '#FFFFFF', // TTEXT COLOR
                align: 'center'
            }).setOrigin(0.5); // Center the text within the bar

            offsetX += spacing; // Space next bar to the right
        });

        stationData.barChart = barChart; // Store the bar chart with station data for updates
    };

    const updateStationBarChart = (stationData) => {
        // Clear the existing bar chart graphics if it exists
        if (stationData.barChart) {
            stationData.barChart.clear();
        } else {
            stationData.barChart = this.add.graphics(); // Initialize if not already defined
        }

        // Clear existing text elements associated with this bar chart
        if (!stationData.barChartText) {
            stationData.barChartText = [];
        } else {
            stationData.barChartText.forEach(text => text.destroy());
            stationData.barChartText = []; // Reset for new elements
        }

        const stationX = stationData.x;
        const stationY = stationData.y - 30; // Position above the station

        const barWidth = 20;
        const spacing = 20;
        const baseHeight = 5;
        const maxWagonHeight = 100;

        // Recalculate wagon type counts at the station
        const wagonTypeCounts = stationData.wagonTypes.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        let offsetX = stationX - ((Object.keys(wagonTypeCounts).length - 1) * spacing) / 2;

        Object.entries(wagonTypeCounts).forEach(([wagonType, count]) => {
            const wagonColor = wagonColors[wagonType] || 0xFFFFFF;
            const barHeight = Math.min(count * baseHeight, maxWagonHeight);

            // Draw each bar for remaining wagons at the station
            stationData.barChart.fillStyle(wagonColor, 1);
            stationData.barChart.fillRect(offsetX, stationY - barHeight, barWidth, barHeight);

            // Add the count text above each bar and store it for easy clearing
            const countText = this.add.text(offsetX + barWidth / 2, stationY - barHeight / 2, count, {
                font: '12px Arial',
                fill: '#FFFFFF',
                align: 'center'
            }).setOrigin(0.5);

            stationData.barChartText.push(countText); // Store for clearing on next update

            offsetX += spacing;
        });

        console.log(`Updated bar chart for station ${stationData.id} with wagon counts:`, wagonTypeCounts);
    }

    // Function to create the "Go" button using a star shape
    const createGoButton = (x, y, scene) => {
        const buttonGraphics = scene.add.graphics();
        const buttonRadius = 20; // Match the star shape's radius

        // Draw the "Go" button as a star, positioned at the station
        drawStar(buttonGraphics, x, y, buttonRadius, 0x4A3267, 0.5);  // Use station color with 50% opacity

        // Add "Go" text at the center of the star
        const buttonText = scene.add.text(x, y, 'Go', {
            font: '16px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5); // Center the text within the star shape

        // Set interactivity for the button
        buttonGraphics.setInteractive(
            new Phaser.Geom.Circle(x, y, buttonRadius), // Define interaction area as a circle around the star
            Phaser.Geom.Circle.Contains
        );

        return { buttonGraphics, buttonText };
    };



    // Step 1: Draw the stations on the map
    stationPositions.forEach((stationData) => {
        let station = this.add.circle(stationData.x, stationData.y, 15, 0x4A3267, 0.0); // Add station circle
        // Create a graphics object to draw the station as a star
        const stationGraphics = this.add.graphics();
        const stationColor = 0x4A3267; // color for the star (if change fix color in createGoButton too)

        // Draw the star at the station's position
        drawStar(stationGraphics, stationData.x, stationData.y, 20, stationColor, .5);
        station.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains); // Make station clickable

        station.stationID = stationData.id;
        stations.push(station); // Add station to the array
        mapLayer.add(station);  // Add the station to the map layer 




        // STATION NAME
        this.add.text(stationData.x, stationData.y, stationData.name, {
            font: '16px Arial',
            fill: '#ffffff'
        }).setOrigin(.5);


        // console.log("STATION DATA", stationData)
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
            //updateSidebar(initialStation.id, initialStation.name, initialStation.wagonTypes);
            updateWagonPositions();
            updateSidebarTrainGraphics();
        }

        // Initialize wagons array at the station
        stationData.wagons = [];

        if (stationData.wagonTypes && stationData.wagonTypes.length > 0) {
            createStationBarChart(stationData);  // Draw bar chart above the station
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
                graphics.lineStyle(4, 0xFFFF00, 0.4);
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

                //updateSidebar(toStation.id, toStation.name, toStation.wagonTypes);
                console.log("Info Text Title:", infoTextTitle.visible, infoTextTitle.x, infoTextTitle.y);
                console.log("Station Name Text:", stationNameText.visible, stationNameText.x, stationNameText.y);
                console.log("Wagon Text:", wagonText.visible, wagonText.x, wagonText.y);
                console.log("Train Label:", trainLabel.visible, trainLabel.x, trainLabel.y);
                updateStationBarChart(fromStation);
                updateWagonPositions();
                updateSidebarTrainGraphics();
            }
        });
    }
    const attachWagon = (wagonType, stationID) => {
        // Check if the locomotive is at the correct station
        if (locomotive.currentStation !== stationID) {
            console.log(`Cannot attach wagons from station ${stationID} when locomotive is at station ${locomotive.currentStation}.`);
            return;
        }

        // Create a new wagon object with map graphics and add it to `attachedWagons`
        const newWagon = {
            wagonType,
            mapGraphic: this.add.circle(0, 0, 5, wagonColors[wagonType] || 0xFFFFFF).setDepth(1) // Circle graphic on map
        };
        attachedWagons.push(newWagon);

        // Remove the first occurrence of the wagon type from the station's `wagonTypes` array
        const station = stationPositions.find(s => s.id === stationID);
        const wagonIndex = station.wagonTypes.indexOf(wagonType);
        if (wagonIndex > -1) {
            station.wagonTypes.splice(wagonIndex, 1); // Remove one instance of the attached wagon type
        }

        // Refresh the sidebar train display and update the station bar chart
        updateSidebarTrainGraphics();
        updateStationBarChart(station);

        // Update the map to reflect the new wagon attachment
        updateWagonPositions();

        console.log(`Attached wagons:`, attachedWagons);
    }


    // Update the positions of wagons behind the locomotive
    function updateWagonPositions() {
        trainGraphics.clear(); // Clear previous lines before redrawing

        const firstWagonOffset = 20;      // Distance for the first wagon (adjust to avoid overlap with locomotive)
        const subsequentWagonOffset = 10; // Distance between each following wagon

        attachedWagons.forEach((wagon, index) => {
            // Calculate the distance for each wagon
            const distance = index === 0
                ? firstWagonOffset
                : firstWagonOffset + subsequentWagonOffset * index;

            // Offset each wagon by angle and distance
            const offsetX = Math.cos(locomotive.rotation) * distance;
            const offsetY = Math.sin(locomotive.rotation) * distance;

            // Position the wagon's map graphic based on the calculated distance from the locomotive
            wagon.mapGraphic.x = locomotive.x - offsetX;
            wagon.mapGraphic.y = locomotive.y - offsetY;

            // Match the rotation of the locomotive for alignment
            wagon.mapGraphic.rotation = locomotive.rotation;

            // Draw a line between each wagon and the locomotive or previous wagon
            trainGraphics.lineStyle(4, 0x000000);
            trainGraphics.beginPath();

            if (index === 0) {
                // Draw line from locomotive to the first wagon
                trainGraphics.moveTo(locomotive.x, locomotive.y);
            } else {
                // Draw line between consecutive wagons
                const previousWagon = attachedWagons[index - 1];
                trainGraphics.moveTo(previousWagon.mapGraphic.x, previousWagon.mapGraphic.y);
            }

            trainGraphics.lineTo(wagon.mapGraphic.x, wagon.mapGraphic.y);
            trainGraphics.strokePath();
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

            // Show station info in the info panel and ensure sidebar visibility
            updateSidebar(clickedStationData.id, clickedStationData.name, clickedStationData.wagonTypes);

            // Show sidebar immediately on station click
            showSidebar();
            console.log("Sidebar should now be visible:", sidebarLayer.visible);
            // Get the current station ID of the locomotive
            const currentStationId = locomotive.currentStation;

            // Check if the clicked station is connected and reachable from the locomotive's current station
            const currentStationData = stationPositions.find(s => s.id === currentStationId);
            const isReachable = currentStationData.connections.includes(clickedStationData.id);

            // Set current target station only if reachable
            if (isReachable) {
                currentTargetStation = clickedStationData;

                // Remove existing "Go" button if it exists
                if (goButtonCircle) goButtonCircle.destroy();
                if (goButtonText) goButtonText.destroy();

                // Create the "Go" button as a star on the clicked station
                const { buttonGraphics, buttonText } = createGoButton(station.x, station.y, this);

                // Update references for the "Go" button to the newly created graphics and text
                goButtonCircle = buttonGraphics;
                goButtonText = buttonText;

                // Handle click on the "Go" button star
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