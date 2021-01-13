import EventQueue from "../Events/EventQueue";
import InputReceiver from "../Input/InputReceiver";
import InputHandler from "../Input/InputHandler";
import Recorder from "../Playback/Recorder";
import Debug from "../Debug/Debug";
import ResourceManager from "../ResourceManager/ResourceManager";
import Viewport from "../SceneGraph/Viewport";
import SceneManager from "../Scene/SceneManager";
import AudioManager from "../Sound/AudioManager";
import Stats from "../Debug/Stats";
import RenderingManager from "../Rendering/RenderingManager";
import CanvasRenderer from "../Rendering/CanvasRenderer";
import Color from "../Utils/Color";
import GameOptions from "./GameOptions";

/**
 * The main loop of the game engine.
 * Handles the update order, and initializes all subsystems.
 * The GameLoop manages the update cycle, and requests animation frames to render to the browser.
 */
export default class GameLoop {
    gameOptions: GameOptions;

	/** The max allowed update fps.*/
    private maxUpdateFPS: number;
    
    /** The timestep for each update. This is the deltaT passed to update calls. */
	private simulationTimestep: number;

    /** The amount of time we are yet to simulate. */
    private frameDelta: number;

    /** The time when the last frame was drawn. */
    private lastFrameTime: number;
    
    /** The minimum time we want to wait between game frames. */
    private minFrameDelay: number;

	/** The current frame of the game. */
	private frame: number;

	/** The actual fps of the game. */
    private fps: number;
    
    /** The time between fps measurement updates. */
    private fpsUpdateInterval: number;

    /** The time of the last fps update. */
    private lastFpsUpdate: number;

    /** The number of frames since the last fps update was done. */
    private framesSinceLastFpsUpdate: number;

    /** The status of whether or not the game loop has started. */
    private started: boolean;
    
    /** The status of whether or not the game loop is currently running. */
    private running: boolean;
    
    /** The panic state of the game. True if we have too many update frames in a single render. */
    private panic: boolean;

    /** The number of update steps this iteration of the game loop. */
    private numUpdateSteps: number;

    // Game canvas and its width and height
    readonly GAME_CANVAS: HTMLCanvasElement;
    readonly DEBUG_CANVAS: HTMLCanvasElement;
	readonly WIDTH: number;
    readonly HEIGHT: number;
    private viewport: Viewport;
    private ctx: CanvasRenderingContext2D;
    private clearColor: Color;
    
    // All of the necessary subsystems that need to run here
	private eventQueue: EventQueue;
	private inputHandler: InputHandler;
	private inputReceiver: InputReceiver;
	private recorder: Recorder;
    private resourceManager: ResourceManager;
    private sceneManager: SceneManager;
    private audioManager: AudioManager;
    private renderingManager: RenderingManager;

    /**
     * Creates a new GameLoop
     * @param options The options for GameLoop initialization
     */
    constructor(options?: Record<string, any>){
        // Typecast the config object to a GameConfig object
        this.gameOptions = GameOptions.parse(options);

        this.maxUpdateFPS = 60;
        this.simulationTimestep = Math.floor(1000/this.maxUpdateFPS);
        this.frameDelta = 0;
        this.lastFrameTime = 0;
        this.minFrameDelay = 0;
        this.frame = 0;
        this.fps = this.maxUpdateFPS;   // Initialize the fps to the max allowed fps
        this.fpsUpdateInterval = 1000;
        this.lastFpsUpdate = 0;
        this.framesSinceLastFpsUpdate = 0;
        this.started = false;
        this.running = false;
        this.panic = false;
        this.numUpdateSteps = 0;

        // Set the max fps to 60fps
        // this.setMaxFPS(60);

        // Get the game canvas and give it a background color
        this.GAME_CANVAS = <HTMLCanvasElement>document.getElementById("game-canvas");
        this.DEBUG_CANVAS = <HTMLCanvasElement>document.getElementById("debug-canvas");
    
        // Give the canvas a size and get the rendering context
        this.WIDTH = this.gameOptions.viewportSize.x;
        this.HEIGHT = this.gameOptions.viewportSize.y;

        // For now, just hard code a canvas renderer. We can do this with options later
        this.renderingManager = new CanvasRenderer();
        this.initializeGameWindow();
        this.ctx = this.renderingManager.initializeCanvas(this.GAME_CANVAS, this.WIDTH, this.HEIGHT);
        this.clearColor = new Color(this.gameOptions.clearColor.r, this.gameOptions.clearColor.g, this.gameOptions.clearColor.b);

        // Initialize debug canvas
        
        Debug.initializeDebugCanvas(this.DEBUG_CANVAS, this.WIDTH, this.HEIGHT);

        // Size the viewport to the game canvas
        this.viewport = new Viewport();
        this.viewport.setCanvasSize(this.WIDTH, this.HEIGHT);
        this.viewport.setSize(this.WIDTH, this.HEIGHT);

        // Initialize all necessary game subsystems
        this.eventQueue = EventQueue.getInstance();
        this.inputHandler = new InputHandler(this.GAME_CANVAS);
        this.inputReceiver = InputReceiver.getInstance();
        this.inputReceiver.setViewport(this.viewport);
        this.recorder = new Recorder();
        this.resourceManager = ResourceManager.getInstance();
        this.sceneManager = new SceneManager(this.viewport, this, this.renderingManager);
        this.audioManager = AudioManager.getInstance();

        Stats.initStats();
    }

    /**
     * Set up the game window that holds the canvases
     */
    private initializeGameWindow(): void {
        const gameWindow = document.getElementById("game-window");
        
        // Set the height of the game window
        gameWindow.style.width = this.WIDTH + "px";
        gameWindow.style.height = this.HEIGHT + "px";
    }

    /**
     * Changes the maximum allowed physics framerate of the game
     * @param initMax The max framerate
     */
    setMaxUpdateFPS(initMax: number): void {
        this.maxUpdateFPS = initMax;
        this.simulationTimestep = Math.floor(1000/this.maxUpdateFPS);
    }

    /**
     * Sets the maximum rendering framerate
     * @param maxFPS The max framerate
     */
    setMaxFPS(maxFPS: number): void {
        this.minFrameDelay = 1000/maxFPS;
    }

    /**
     * Retreives the SceneManager from the GameLoop
     * @returns The SceneManager
     */
    getSceneManager(): SceneManager {
        return this.sceneManager;
    }

    /**
     * Updates the frame count and sum of time for the framerate of the game
     * @param timestep The current time in ms
     */
    private updateFPS(timestamp: number): void {
        this.fps = 0.9 * this.framesSinceLastFpsUpdate * 1000 / (timestamp - this.lastFpsUpdate) +(1 - 0.9) * this.fps;
        this.lastFpsUpdate = timestamp;
        this.framesSinceLastFpsUpdate = 0;

        Debug.log("fps", "FPS: " + this.fps.toFixed(1));
        Stats.updateFPS(this.fps);
    }

    /**
     * Starts up the game loop and calls the first requestAnimationFrame
     */
    start(): void {
        if(!this.started){
            this.started = true;

            window.requestAnimationFrame(this.startFrame);
        }
    }

    /**
     * The first game frame - initializes the first frame time and begins the render
     * @param timestamp The current time in ms
     */
    startFrame(timestamp: number): void {
        this.running = true;

        this.render();

        this.lastFrameTime = timestamp;
        this.lastFpsUpdate = timestamp;
        this.framesSinceLastFpsUpdate = 0;

        window.requestAnimationFrame(this.doFrame);
    }

    /**
     * The main loop of the game. Updates and renders every frame
     * @param timestamp 
     */
    doFrame(timestamp: number): void {
        // Request animation frame to prepare for another update or render
        window.requestAnimationFrame(this.doFrame);

        // If we are trying to update too soon, return and do nothing
        if(timestamp < this.lastFrameTime + this.minFrameDelay){
            return
        }

        // Currently, update and draw are synced - eventually it would probably be good to desync these
        this.frameDelta += timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Update the estimate of the framerate
        if(timestamp > this.lastFpsUpdate + this.fpsUpdateInterval){
            this.updateFPS(timestamp);
        }

        this.frame++;
        this.framesSinceLastFpsUpdate++;

        // Update while we can (This will present problems if we leave the window)
        this.numUpdateSteps = 0;
        while(this.frameDelta >= this.simulationTimestep){
            this.update(this.simulationTimestep/1000);
            this.frameDelta -= this.simulationTimestep;

            this.numUpdateSteps++;
            if(this.numUpdateSteps > 100){
                this.panic = true;
                break;
            }
        }

        // Updates are done, draw
        this.render();

        // End the frame
        this.end();

        this.panic = false;
    }

    /**
     * Ends the game loop
     */
    end(){
        if(this.panic) {
            var discardedTime = Math.round(this.resetFrameDelta());
            console.warn('Main loop panicked, probably because the browser tab was put in the background. Discarding ' + discardedTime + 'ms');
        }
    }

    resetFrameDelta() : number {
        var oldFrameDelta = this.frameDelta;
        this.frameDelta = 0;
        return oldFrameDelta;
    }

    /**
     * Updates all necessary subsystems of the game. Defers scene updates to the sceneManager
     * @param deltaT The time sine the last update
     */
    update(deltaT: number): void {
        // Handle all events that happened since the start of the last loop
        this.eventQueue.update(deltaT);

        // Update the input data structures so game objects can see the input
        this.inputReceiver.update(deltaT);

        // Update the recording of the game
        this.recorder.update(deltaT);

        // Update all scenes
        this.sceneManager.update(deltaT);

        // Update all sounds
        this.audioManager.update(deltaT);
        
        // Load or unload any resources if needed
        this.resourceManager.update(deltaT);
    }

    /**
     * Clears the canvas and defers scene rendering to the sceneManager. Renders the debug canvas
     */
    render(): void {
        // Clear the canvases
        this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        Debug.clearCanvas();

        // Game Canvas
        this.ctx.fillStyle = this.clearColor.toString();
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        this.sceneManager.render();

        // Debug render
        Debug.render();
        Stats.render();
    }
}