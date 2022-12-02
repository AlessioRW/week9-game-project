import Phaser, { NONE } from 'phaser'

const gameSize = {x:320,y:320}

const numberOfLevels = 6
let currentStage = 0
function renderStage(ctx,currentStage,newPos,velocity){
  //console.log(currentStage)
  let stageObj = stages[currentStage]
  for (let background of stageObj.backgrounds){
    //console.log(background)
    background.visible = true
  }
  //add decorations
  stageObj.decorations.visible = true

  //add colliders and make them visible
  if (player){
    player.destroy()
  }
  
  player = ctx.physics.add.sprite(newPos.x, newPos.y, 'neutral');
  player.body.setVelocity(velocity.x,velocity.y)
  player.body.setSize(25,40)
  player.body.setOffset(43, 40);

  player.setScale(0.9)
  player.setBounce(0.9,0);

  //make gnome visible and add collider
  if (currentStage === 4){
    gnome.visible = true
    gnomeCollider = ctx.physics.add.overlap(player,gnome,win)
    //stageObj.gnomeCollider = gnomeCollider
  }

  currentColliderObject = ctx.physics.add.collider(player,stageObj.colliders) //when rendering new stage, use currentColliderObject.destroy() to remove current colliders
  stageObj.colliders.visible = true

}

function deloadStage(ctx, currentStage){
  currentColliderObject.destroy()
  let stageObj = stages[currentStage]
  stageObj.colliders.visible = false
  stageObj.decorations.visible = false

  //deload gnome and it's overlap callback if stage === 4
  if (currentStage === 4){
    gnomeCollider.destroy()
    gnome.visible = false
  }

  for (let background of stageObj.backgrounds){
    background.visible = false
  }
}

let stages = [] //arr of objects  => [{tilemap: ,collisionTiles_1: , decorationTiles_1: }, {collisionTiles_2: , decorationTiles_2: }]
function generateStages(ctx){ //add all stage data to stages arr to be rendered accordingly

  for (let i = 0; i < numberOfLevels; i ++){
    let stageObj = {}

    //define tilemap
    let stage = ctx.make.tilemap({key: `stage-${i+1}-json`})
    let tileset = stage.addTilesetImage('stringstar', 'tileMapImage')

    //add 3 background layers to stage
    let backgrounds = []
    for (let x = 0; x < 3; x++){
      let backgroundLayerImage = stage.addTilesetImage(`background-${x}`, `background-${x}`)
      let backgroundImage = stage.createLayer(`background/background-${x}`, backgroundLayerImage, 0, 0)
      backgroundImage.visible = false
      backgrounds.push(backgroundImage)
    }


    //add collision layer
    let stageColliderPlatforms = stage.createLayer('collision', tileset, 0, 0)
    stageColliderPlatforms.setCollisionByExclusion(-1, true)
    //colliderPlatforms.setCollisionByProperty({ collides: true })
  
    //add decoration layer
    let decorationLayer = stage.createLayer('decs', tileset, 0, 0)

    //make stage invisble before so they can be rendered indiviually
    decorationLayer.visible = false
    stageColliderPlatforms.visible = false

    stageObj.colliders = stageColliderPlatforms
    stageObj.decorations= decorationLayer
    stageObj.backgrounds = backgrounds
    stages.push(stageObj)
  }
  gnome = ctx.physics.add.sprite(95,112,'gnome')
  gnome.body.allowGravity = false
  gnome.visible = false
}

let frameStart = new Date()
let frameCounter = 0

let heightText;
let cursors;
let newtext;
let gnomeCollider;
let gnome;
let currentColliderObject;
let player;
let crouched = false; //player is crouching, will roll if moving
let preJump = false; //player is about to jump
let inAir = false; //player has jumped and not collided with the floor yet
let running = false //player is currently running/moving left or right
let horizJump = 0; //direction player is going to jump when w is released
let startTime = 0; //determining how far player jumps using change in time between press and release
let runningVelocity = 150
let crochVelocity = 100
let music;

function getFPS(){
  let frameEnd = new Date()
  let fps = 60/((frameEnd.getTime() - frameStart.getTime())/1000)
  frameStart = new Date()
  return(Math.floor(fps))
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: gameSize.x,
  height: gameSize.y,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  player: {}
})

function preload() {
  this.load.audio('dwarf_fortress', 'assets/dwarf_fortress.mp3')
  this.load.image('cat', 'https://media.tenor.com/HseHXaJz2OAAAAAM/sad-cry.gif');
  this.load.spritesheet('neutral', 'assets/knight/_Idle.png', {frameWidth: 120, frameHeight: 80})
  this.load.spritesheet('running', 'assets/knight/_Run.png', {frameWidth: 120, frameHeight: 80})
  this.load.spritesheet('crouch', 'assets/knight/_CrouchFull.png', {frameWidth: 120, frameHeight: 80})
  this.load.spritesheet('jump', 'assets/knight/_Jump.png', {frameWidth: 120, frameHeight: 80})
  this.load.spritesheet('fall', 'assets/knight/_Fall.png', {frameWidth: 120, frameHeight: 80})
  this.load.spritesheet('crouch-walk','assets/knight/_crouchWalk.png', {frameWidth: 960/8, frameHeight: 80})
  this.load.spritesheet('gnome','assets/gnome.png', {frameWidth: 960/8, frameHeight: 80})

  this.load.image('tileMapImage', 'assets/stringstar-fields/tileset.png')
  this.load.image('background-0','assets/stringstar-fields/background_0.png')
  this.load.image('background-1','assets/stringstar-fields/background_1.png')
  this.load.image('background-2','assets/stringstar-fields/background_2.png')

  for (let i = 1; i <= numberOfLevels; i ++){
    this.load.tilemapTiledJSON(`stage-${i}-json`, `assets/tilemaps/stage${i}.json`);
    this.load.image(`stage${i}-map`,`assets/tilemaps/stage${i}.json`)
  }
}


function create() {
  this.anims.create({
    key: 'run',
    frameRate: 15,
    repeat: -1,
    frames: this.anims.generateFrameNumbers('running', {start:1, end:9})
  })

  this.anims.create({
    key: 'idle',
    frameRate: 15,
    repeat: -1,
    frames: this.anims.generateFrameNumbers('neutral', {start:0, end:9})
  })

  this.anims.create({
    key: 'crouch',
    frameRate: 15,
    frames: this.anims.generateFrameNumbers('crouch', {start:0, end:2})
  })

  this.anims.create({ 
    key: 'jump',
    frameRate: 15,
    frames: this.anims.generateFrameNumbers('jump', {start:0, end:2})
  })

  this.anims.create({ 
    key: 'fall',
    repeat: -1,
    frameRate: 15,
    frames: this.anims.generateFrameNumbers('fall', {start:0, end:2})
  })

  this.anims.create({
    key: 'crouch-walk',
    repeat: -1,
    frameRate: 10,
    frames: this.anims.generateFrameNumbers('crouch-walk', {start:0, end:2})
  })

  this.anims.create({

  })
  
  //player = this.physics.add.sprite(280, gameSize.y - 200, 'neutral');
  //player.setCollideWorldBounds(true); //can't move off screen

  music = game.sound.add('dwarf_fortress')
  music.volume = 0.2
  music.loop = true
  music.play()

  generateStages(this)
  renderStage(this,currentStage,{x:180, y:200},{x:0, y:0})
  newtext = this.add.text(135,80,'', {fontSize: '20px', color: "#FF4231"})
  heightText = this.add.text(5,5,'Height: ', {fontSize: '10px', color: "#FF4231"})
  //player.anims.play('idle',true)
}

// ------------------------------------------

function move(ctx){
  if (ctx.key === 'ArrowDown'){
    if (!inAir && !preJump){
      crouched = true
      // player.body.setSize(24,30)
      // player.body.setOffset(43,50)
    }
  }

  if (ctx.key === ' '){ //prepare jump
    if (!inAir && !preJump){
      player.setVelocityX(0)
      startTime = new Date() //start timing how long player has held down the w key
      preJump = true
    }
  }

  else if (ctx.key === 'ArrowLeft'){ //turn left and run if not preJump or jumping
    horizJump = -300
    player.flipX = true
    player.body.setOffset(52, 40)

    if (!inAir && !preJump){
      if (!crouched){
        player.setVelocityX(-runningVelocity)
      } else {
        player.setVelocityX(-crochVelocity)
      }
      
    }
  }

  else if (ctx.key === 'ArrowRight'){ //turn right and run if not preJump or jumping
    horizJump = 300
    player.flipX = false
    player.body.setOffset(43, 40)

    if (!inAir && !preJump){
      if (!crouched){
        player.setVelocityX(runningVelocity)
      } else {
        player.setVelocityX(crochVelocity)
      }
    }
  }
}

function stop(ctx){
  if (ctx.key === ' '){
    if (!inAir && preJump){ //jump, height is determined on how long w is held
      const endTime = new Date()
      const jumpPower = (endTime.getTime() - startTime.getTime())
      
      player.setVelocity(horizJump,-jumpPower)
      inAir = true

      preJump = false
    }
  }

  if (ctx.key === 'ArrowLeft' || ctx.key === 'ArrowRight'){
    horizJump = 0
    if (!inAir){
      player.setVelocityX(0)
    }
  }

  if (ctx.key === 'ArrowDown'){
    // player.body.setSize(25,40)
    // player.body.setOffset(43, 40);
    crouched = false
  }

}

function decideAnimation(){
  if (inAir){
    if (player.body.velocity.y > 0){
      player.anims.play('fall', true)
    } else {
      player.anims.play('jump', true)
    }
  } else {
    if (preJump) {
      player.anims.play('crouch', false)
    } else {
      if (running){
        if (crouched){
          player.anims.play('crouch-walk', true)
        } else {
          player.anims.play('run', true)
        }
      } else {
        if (crouched) {
          player.anims.play('crouch', false)
        } else {
          player.anims.play('idle', true)
        }
      }
    }
  }
}

function movementLogic(){
  if (player.body.onFloor()){ //if the player is touching the ground
    if (inAir){
      player.setVelocity(0,0)
      running = false
    } else {
      if (player.body.velocity.x !== 0){
        running = true
      } else {
        running = false
      }
    }
    inAir = false
  } else { //currenty in air
    inAir = true
    running = false
  }
}
function win(){
  gnome.body.acceleration.y = -50
  gnome.body.angularVelocity = 50
  newtext.setText('You freed him\nWell done')
}

//Game loop, all game logic for what is going on in game
//runs every frame
function update() { 
  
  heightText.setText(`Height: ${(320-Math.floor(player.body.position.y))+(320*(currentStage+1))}`)
  if (frameCounter >= 60){
    frameCounter = 0 
    //console.log(getFPS())
  }

  //this is probably really inefficient as it only needs to be done once in create
  this.input.keyboard.on('keydown', move);
  this.input.keyboard.on('keyup', stop)

  decideAnimation() //change player model based on movement variables
  movementLogic() //change movement variables based on input/logic
  
  // console.log(player.body.position)
  if (player.body.position.y < -50){ //player went up stage
    deloadStage(this,currentStage) //unload current stage
    currentStage += 1

    // player.setPosition(player.body.position.x+34, this.sys.game.canvas.height-50)
    renderStage(this,currentStage, {x:player.body.position.x, y:this.sys.game.canvas.height-(player.body.height/2)},{x:player.body.velocity.x, y:player.body.velocity.y})

  } else if (player.body.position.y > this.sys.game.canvas.height-(player.body.height/2)){ //player goes down stage
    deloadStage(this,currentStage) //unload current stage
    currentStage -= 1

    // player.setPosition(player.body.position.x+34, 50)
    renderStage(this,currentStage,{x:player.body.position.x+34, y:-50},{x:player.body.velocity.x, y:player.body.velocity.y})
  }

  if (player.body.position.x <= 0){
    player.body.velocity.x = -200
  } else if (player.body.position.x >= 320){
    player.body.velocity.x = 200
  }
  frameCounter += 1
}