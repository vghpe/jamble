

Cleanup: 
- [ ] Setup level manager.
	- [ ] Move all this instantiation from game.ts into here. 
	- [ ] Refactor control panel modules to use LevelManager instead of direct player references.
- [ ] Consider the sensor object, do we need it or could it just be a gameobject. 
- [ ] Simplify collision math of player hardness softness. Lives inside the base npc. Should maybe be be more tied to Character NPC rather than NPC base. 
- [ ] Consider removing Remove old shop (and economy system)
- [ ] We might have added a bunch of update loop we don't need each time we create a debug parameter. They are made so I can change values at runtiem but might not need to update that often once we've found the values. 
- [ ] When we export a build I should probably strip out the debug code. 
- [ ] Remove tree debug code. 








