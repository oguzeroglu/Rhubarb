# Rhubarb

Rhubarb is a lightweight WebSocket library for multiplayer HTML5 games. It is originally designed to be used by the [ROYGBIV Engine](https://github.com/oguzeroglu/ROYGBIV). However it can be used outside of ROYGBIV as well.

Rhubarb is named after this [Aphex Twin track](https://www.youtube.com/watch?v=_AWIqXzvX-U).

Rhubarb works both on browsers and NodeJS.


![](/rhubarb.gif?raw=true)    

## Philosophy

Javascript is slow, therefore we want to have as much main-process-power as we can
in order to do game related calculations, graphics rendering and achieving 60 FPS.

For multiplayer games achieving 60 FPS gets even more complicated given that transferring data
over WebSockets is a slow operation. It also triggers GC activity by copying the transferred
data (if JSON is the preferred way), which eventually slows down the main thread as well.

Rhubarb is designed to overcome these problems by:

1. Using WebWorkers to handle networking out of main thread -> More time left for rendering in main thread
2. Using transferables between the main thread and the worker to prevent GC activity (zero copy)
3. Redefining/compressing and sending protocols using Float32Arrays -> Much less bandwidth consumption than *JSON.stringify*.
4. Allowing users to define their protocols in a high-level way and taking care of all the dirty bitwise operations internally.
5. Allowing sharing same protocol definitions between server/client.
6. Allocating objects only when being initialized. Reusing everything to prevent GC activity (That means *mutating* things, yeah get over it.)

## Usage

See [this tutorial](https://github.com/oguzeroglu/Rhubarb/wiki/Getting-started) to see how to use Rhubarb.

## Licence

Rhubarb uses MIT license.
