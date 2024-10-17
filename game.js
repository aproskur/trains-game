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
    this.load.image('train1', 'images/train1.png');
    this.load.image('train2', 'images/train2.png');
    this.load.image('train3', 'images/train3.png');
    this.load.image('train4', 'images/train4.png');
}

function create() {
    // Create the map and center it
    const map = this.add.image(0, 0, 'map').setOrigin(0, 0);

    // Set world bounds to match the image size
    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);

    // Center the camera on the map
    this.cameras.main.centerOn(map.width / 2, map.height / 2);

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

    const stationPositions = [
        { id: 1, x: 237, y: 215, name: "Весёлая лужайка", connections: [2], hasLocomotive: true, wagonType: null },
        { id: 2, x: 441, y: 154, name: "Кукурузное поле", connections: [1, 4], hasLocomotive: false, wagonType: 'train2' },
        { id: 3, x: 254, y: 504, name: "Солнечный берег", connections: [], hasLocomotive: false, wagonType: null },
        { id: 4, x: 700, y: 350, name: "Весёлый паравозик", connections: [2, 5, 6], hasLocomotive: false, wagonType: 'train3' },
        { id: 5, x: 900, y: 150, name: "Эверест", connections: [4], hasLocomotive: false, wagonType: 'train4' },
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
        station.setInteractive();
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
        locomotive.setRotation(angle);  // Rotate the locomotive

        // Move the locomotive using a tween
        const tween = this.tweens.add({
            targets: locomotive,
            x: toStation.x,
            y: toStation.y,
            duration: 2000,  // Time in milliseconds to complete movement
            ease: 'Power2',
            onComplete: () => {
                locomotive.currentStation = toStationId;  // Update current station
            }
        });
    }

    // Example Interaction to Move Locomotive Between Stations
    stations.forEach(station => {
        station.on('pointerdown', () => {
            console.log(`Clicked on station ${station.stationID}`);

            // Move locomotive to the clicked station if it's connected
            const currentStationId = locomotive.currentStation;
            const currentStationData = stationPositions.find(s => s.id === currentStationId);

            // Check if the clicked station is connected to the current one
            if (currentStationData.connections.includes(station.stationID)) {
                moveLocomotive.call(this, currentStationId, station.stationID);
            } else {
                console.log("Locomotive can only move to connected stations.");
            }
        });
    });
}



function update() {

    //DEBUG. TO identify points coordinates on the map
    //console.log(`Pointer X: ${this.input.mousePointer.worldX}, Pointer Y: ${this.input.mousePointer.worldY}`);
}
