using System.Collections.Generic;
using ArenaBehaviors;
using CoralBrain;
using HUD;
using MoreSlugcats;
using OverseerHolograms;
using RWCustom;
using UnityEngine;

public class Overseer : Creature, PhysicalObject.IHaveAppendages, ITeleportingCreature, Weapon.INotifyOfFlyingWeapons, IOwnAHUD
{
	public class Mode : ExtEnum<Mode>
	{
		public static readonly Mode Watching = new Mode("Watching", register: true);

		public static readonly Mode Withdrawing = new Mode("Withdrawing", register: true);

		public static readonly Mode Zipping = new Mode("Zipping", register: true);

		public static readonly Mode Emerging = new Mode("Emerging", register: true);

		public static readonly Mode SittingInWall = new Mode("SittingInWall", register: true);

		public static readonly Mode Conversing = new Mode("Conversing", register: true);

		public static readonly Mode Projecting = new Mode("Projecting", register: true);

		public Mode(string value, bool register = false)
			: base(value, register)
		{
		}
	}

	public IntVector2 hoverTile;

	public IntVector2 rootTile;

	public Vector2 rootPos;

	public Vector2 lastRootPos;

	public Vector2 rootDir;

	public Vector2 lastRootDir;

	public IntVector2 nextHoverTile;

	public Overseer conversationPartner;

	public Overseer lastConversationPartner;

	public List<IntVector2> zipPath;

	public int zipPathCount;

	public Mode mode = Mode.Watching;

	public Mode afterWithdrawMode;

	public float zipProgSpeed;

	public float[] zipProgs;

	public float extended = 1f;

	public float lastExtended = 1f;

	public OverseerAI AI;

	public float size;

	public int stationaryCounter;

	public bool zipMeshDirection;

	public CoralNeuronSystem neuronSystem;

	public int conversationDelay;

	private bool leaveRoomOnZipCompletion;

	public float dying;

	public float lastDying;

	public OverseerHologram hologram;

	public SandboxEditor.EditCursor editCursor;

	public bool forceShelterNeed;

	public bool forceShowHologram;

	public bool PlayerGuide => (base.abstractCreature.abstractAI as OverseerAbstractAI).playerGuide;

	public bool SandboxOverseer => editCursor != null;

	public bool SafariOverseer
	{
		get
		{
			if (ModManager.MSC && base.abstractCreature.abstractAI != null)
			{
				return (base.abstractCreature.abstractAI as OverseerAbstractAI).safariOwner;
			}
			return false;
		}
	}

	public int CurrentFood => 0;

	public Player.InputPackage MapInput => inputWithDiagonals.Value;

	public bool RevealMap
	{
		get
		{
			if (ModManager.MSC && (base.abstractCreature.abstractAI as OverseerAbstractAI).safariOwner && ((base.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature == null || ((base.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature != null && !(base.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature.controlled)))
			{
				return inputWithDiagonals.Value.pckp;
			}
			return false;
		}
	}

	public Vector2 MapOwnerInRoomPosition => base.firstChunk.pos;

	public bool MapDiscoveryActive => false;

	public int MapOwnerRoom => base.abstractCreature.Room.index;

	public Overseer(AbstractCreature abstractCreature, World world)
		: base(abstractCreature, world)
	{
		zipProgs = new float[5];
		for (int i = 0; i < zipProgs.Length; i++)
		{
			zipProgs[i] = 0f;
		}
		base.bodyChunks = new BodyChunk[1];
		base.bodyChunks[0] = new BodyChunk(this, 0, default(Vector2), 3f, 0.4f);
		bodyChunkConnections = new BodyChunkConnection[0];
		base.GoThroughFloors = true;
		base.airFriction = 0.8f;
		base.gravity = 0f;
		bounce = 0f;
		surfaceFriction = 1f;
		collisionLayer = 0;
		base.waterFriction = 1f;
		base.buoyancy = 0f;
		windAffectiveness = 0.1f;
		currentAffectiveness = 0.1f;
		ChangeCollisionLayer(0);
		base.CollideWithTerrain = false;
		zipPath = new List<IntVector2> { abstractCreature.pos.Tile };
		zipPathCount = 1;
		Random.State state = Random.state;
		Random.InitState(abstractCreature.ID.RandomSeed);
		size = Mathf.Lerp(0.5f, 1f, Random.value);
		Random.state = state;
		if (PlayerGuide && (!ModManager.MSC || (abstractCreature.world.game.StoryCharacter != MoreSlugcatsEnums.SlugcatStatsName.Gourmand && abstractCreature.world.game.StoryCharacter != MoreSlugcatsEnums.SlugcatStatsName.Spear)))
		{
			size = 0.6f;
		}
		appendages = new List<Appendage>();
		appendages.Add(new Appendage(this, 0, 4));
	}

	public override void InitiateGraphicsModule()
	{
		if (base.graphicsModule == null)
		{
			base.graphicsModule = new OverseerGraphics(this);
		}
	}

	public void HardSetTile(IntVector2 setHover, IntVector2 setRoot)
	{
		hoverTile = setHover;
		nextHoverTile = setHover;
		base.mainBodyChunk.HardSetPosition(room.MiddleOfTile(setHover));
		rootTile = setRoot;
		rootPos = room.MiddleOfTile(setRoot);
		lastRootPos = rootPos;
		zipPath = new List<IntVector2> { setRoot };
		zipPathCount = 1;
		AI.ResetZipPathingMatrix(setRoot);
		if (base.graphicsModule != null)
		{
			base.graphicsModule.Reset();
		}
	}

	public override void NewRoom(Room newRoom)
	{
		base.NewRoom(newRoom);
		UpdateCoralNeuronSystem();
		if (ModManager.MSC)
		{
			(base.abstractCreature.abstractAI as OverseerAbstractAI).NewRoom(newRoom);
		}
	}

	public override void PlaceInRoom(Room placeRoom)
	{
		base.PlaceInRoom(placeRoom);
		IntVector2 intVector;
		for (int i = 0; i < 100; i++)
		{
			intVector = new IntVector2(Random.Range(0, room.TileWidth), Random.Range(0, room.TileHeight));
			if (room.GetTile(intVector).Solid)
			{
				continue;
			}
			for (int j = 0; j < 8; j++)
			{
				if (room.GetTile(intVector + Custom.eightDirectionsAndZero[j]).Solid)
				{
					HardSetTile(intVector, intVector + Custom.eightDirectionsAndZero[j]);
					return;
				}
			}
		}
		if (base.abstractCreature.pos.TileDefined)
		{
			for (int k = 0; k < 8; k++)
			{
				if (room.GetTile(base.abstractCreature.pos.Tile + Custom.eightDirectionsAndZero[k]).Solid)
				{
					HardSetTile(base.abstractCreature.pos.Tile, base.abstractCreature.pos.Tile + Custom.eightDirectionsAndZero[k]);
					return;
				}
			}
		}
		intVector = new IntVector2(Random.Range(0, room.TileWidth), Random.Range(0, room.TileHeight));
		HardSetTile(intVector, intVector);
		if (base.graphicsModule != null)
		{
			base.graphicsModule.Reset();
		}
	}

	private void UpdateCoralNeuronSystem()
	{
		if (neuronSystem != null && base.graphicsModule != null)
		{
			for (int i = 0; i < (base.graphicsModule as OverseerGraphics).mycelia.Length; i++)
			{
				neuronSystem.mycelia.Remove((base.graphicsModule as OverseerGraphics).mycelia[i]);
			}
		}
		neuronSystem = null;
		for (int num = room.updateList.Count - 1; num >= 0; num--)
		{
			if (room.updateList[num] is CoralNeuronSystem)
			{
				neuronSystem = room.updateList[num] as CoralNeuronSystem;
				break;
			}
		}
		if (base.graphicsModule != null)
		{
			(base.graphicsModule as OverseerGraphics).UpdateNeuronSystemForMycelia();
		}
	}

	public void TryAddHologram(OverseerHologram.Message message, Creature communicateWith, float importance)
	{
		if (base.dead || (ModManager.MSC && room != null && (room.abstractRoom.name == "SS_AI" || ((room.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Spear || room.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Artificer) && message != OverseerHologram.Message.DangerousCreature && message != OverseerHologram.Message.Shelter && message != OverseerHologram.Message.ForcedDirection && message != OverseerHologram.Message.ProgressionDirection && message != MoreSlugcatsEnums.OverseerHologramMessage.Advertisement) || ((room.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Rivulet || room.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Gourmand) && message != OverseerHologram.Message.DangerousCreature && message != OverseerHologram.Message.Shelter && message != OverseerHologram.Message.ForcedDirection && message != OverseerHologram.Message.FoodObject && message != OverseerHologram.Message.ProgressionDirection && message != MoreSlugcatsEnums.OverseerHologramMessage.Advertisement) || ((room.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Rivulet || room.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Saint) && message == MoreSlugcatsEnums.OverseerHologramMessage.Advertisement && !room.game.IsMoonActive()))))
		{
			return;
		}
		if (hologram != null)
		{
			if (hologram.message == message || (!(hologram.importance < importance) && importance != float.MaxValue))
			{
				return;
			}
			hologram.stillRelevant = false;
			hologram = null;
		}
		if (room == null)
		{
			return;
		}
		if (message == OverseerHologram.Message.GetUpOnFirstBox || message == OverseerHologram.Message.ClimbPole || message == OverseerHologram.Message.SuperJump || message == OverseerHologram.Message.InWorldSuperJump || message == OverseerHologram.Message.EatInstruction || message == OverseerHologram.Message.PickupObject || message == OverseerHologram.Message.ScavengerTrade)
		{
			Options.ControlSetup.Preset activePreset = room.game.rainWorld.options.controls[0].GetActivePreset();
			if (activePreset == Options.ControlSetup.Preset.SwitchHandheld || activePreset == Options.ControlSetup.Preset.SwitchDualJoycon || activePreset == Options.ControlSetup.Preset.SwitchSingleJoyconL || activePreset == Options.ControlSetup.Preset.SwitchSingleJoyconR || activePreset == Options.ControlSetup.Preset.SwitchProController || activePreset == Options.ControlSetup.Preset.PS5DualSense)
			{
				hologram = new OverseerTutorialBehavior.SwitchInstruction(this, message, communicateWith, importance);
			}
			else if (activePreset == Options.ControlSetup.Preset.XBox || activePreset == Options.ControlSetup.Preset.PS4DualShock)
			{
				hologram = new OverseerTutorialBehavior.GamePadInstruction(this, message, communicateWith, importance, activePreset);
			}
			else
			{
				hologram = new OverseerTutorialBehavior.KeyBoardInstruction(this, message, communicateWith, importance);
			}
		}
		else if (message == OverseerHologram.Message.Bats || message == OverseerHologram.Message.TutorialFood)
		{
			hologram = new OverseerHologram.BatPointer(this, message, communicateWith, importance);
		}
		else if (message == OverseerHologram.Message.Shelter)
		{
			hologram = new OverseerHologram.ShelterPointer(this, message, communicateWith, importance);
		}
		else if (message == OverseerHologram.Message.DangerousCreature)
		{
			hologram = new OverseerHologram.CreaturePointer(this, message, communicateWith, importance);
		}
		else if (message == OverseerHologram.Message.ProgressionDirection)
		{
			hologram = new OverseerHologram.DirectionPointer(this, message, communicateWith, importance);
		}
		else if (message == OverseerHologram.Message.GateScene)
		{
			hologram = new OverseerImage(this, message, communicateWith, importance);
		}
		else if (message == OverseerHologram.Message.FoodObject)
		{
			hologram = new OverseerHologram.FoodPointer(this, message, communicateWith, importance);
		}
		else if (message == OverseerHologram.Message.Angry)
		{
			hologram = new AngryHologram(this, message, communicateWith, importance);
		}
		else if (message == OverseerHologram.Message.ForcedDirection)
		{
			hologram = new OverseerHologram.ForcedDirectionPointer(this, message, communicateWith, importance);
		}
		if (ModManager.MSC && message == MoreSlugcatsEnums.OverseerHologramMessage.Advertisement)
		{
			OverseerImage overseerImage = new OverseerImage(this, message, communicateWith, importance);
			overseerImage.setAdvertisement();
			hologram = overseerImage;
		}
		if (ModManager.MMF && MMF.cfgExtraTutorials.Value && message == MMFEnums.OverseerHologramMessage.TutorialGate)
		{
			hologram = new OverseerTutorialBehavior.BasicInputInstruction(this, message, communicateWith, importance);
		}
		room.AddObject(hologram);
	}

	public override void Update(bool eu)
	{
		base.Update(eu);
		if (hologram != null && hologram.slatedForDeletetion)
		{
			hologram = null;
		}
		base.mainBodyChunk.collideWithObjects = extended > 0.2f;
		canBeHitByWeapons = extended > 0.2f;
		if (ModManager.MSC && ((room.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Spear && PlayerGuide) || (base.abstractCreature.abstractAI as OverseerAbstractAI).safariOwner))
		{
			canBeHitByWeapons = false;
		}
		appendages[0].canBeHit = extended > 0.2f;
		appendages[0].Update();
		lastRootPos = rootPos;
		lastRootDir = rootDir;
		lastExtended = extended;
		base.inShortcut = extended <= 0.2f;
		lastDying = dying;
		if (base.dead)
		{
			base.mainBodyChunk.vel += Custom.RNV() * (Random.value * 4f * dying);
			base.mainBodyChunk.pos += Custom.RNV() * (Random.value * 4f * dying);
			if (lastDying == 0f)
			{
				room.PlaySound(SoundID.Overseer_Death, base.mainBodyChunk);
				if (room.ViewedByAnyCamera(base.mainBodyChunk.pos, 400f))
				{
					room.AddObject(new ShockWave(base.mainBodyChunk.pos, 120f * size, 0.05f, 7));
				}
				if (base.graphicsModule != null)
				{
					AbstractPhysicalObject abstractPhysicalObject = new OverseerCarcass.AbstractOverseerCarcass(room.world, null, base.abstractPhysicalObject.pos, room.game.GetNewID(), (base.graphicsModule as OverseerGraphics).MainColor, (base.abstractCreature.abstractAI as OverseerAbstractAI).ownerIterator);
					room.abstractRoom.AddEntity(abstractPhysicalObject);
					abstractPhysicalObject.pos = base.abstractCreature.pos;
					abstractPhysicalObject.RealizeInRoom();
					abstractPhysicalObject.realizedObject.firstChunk.HardSetPosition(base.bodyChunks[0].pos);
					abstractPhysicalObject.realizedObject.firstChunk.vel = base.bodyChunks[0].vel;
					(abstractPhysicalObject.realizedObject as OverseerCarcass).sparkling = 1f;
					(abstractPhysicalObject.realizedObject as OverseerCarcass).rotation = Custom.VecToDeg((base.graphicsModule as OverseerGraphics).useDir);
					(abstractPhysicalObject.realizedObject as OverseerCarcass).lastRotation = (abstractPhysicalObject.realizedObject as OverseerCarcass).rotation;
				}
			}
			extended = 1f;
			dying = Mathf.Min(1f, dying + 1f / 6f);
			if (dying >= 1f)
			{
				Destroy();
			}
		}
		if (conversationDelay > 0)
		{
			conversationDelay--;
		}
		stationaryCounter++;
		rootPos = Vector2.Lerp(rootPos, Custom.RestrictInRect(room.MiddleOfTile(hoverTile), new FloatRect((float)rootTile.x * 20f, (float)rootTile.y * 20f, (float)(rootTile.x + 1) * 20f, (float)(rootTile.y + 1) * 20f)), 0.2f);
		float num = ((mode == Mode.Conversing) ? 100f : 50f) * size;
		if (!Custom.DistLess(room.MiddleOfTile(hoverTile), base.mainBodyChunk.pos, num))
		{
			Vector2 vector = Custom.DirVec(room.MiddleOfTile(hoverTile), base.mainBodyChunk.pos) * (num - Vector2.Distance(room.MiddleOfTile(hoverTile), base.mainBodyChunk.pos));
			base.mainBodyChunk.vel += vector * 0.15f;
			base.mainBodyChunk.pos += vector * 0.15f;
		}
		base.mainBodyChunk.vel += Custom.DirVec(base.mainBodyChunk.pos, room.MiddleOfTile(hoverTile)) * (Mathf.InverseLerp(0f, num, Vector2.Distance(room.MiddleOfTile(hoverTile), base.mainBodyChunk.pos)) * 0.8f * size);
		if (!Custom.DistLess(rootPos, base.mainBodyChunk.pos, num))
		{
			Vector2 vector2 = Custom.DirVec(rootPos, base.mainBodyChunk.pos) * (num - Vector2.Distance(rootPos, base.mainBodyChunk.pos));
			base.mainBodyChunk.vel += vector2 * 0.15f;
			base.mainBodyChunk.pos += vector2 * 0.15f;
		}
		Vector2 vector3 = default(Vector2);
		for (int i = 0; i < 8; i++)
		{
			if (!room.GetTile(rootTile + Custom.eightDirections[i]).Solid)
			{
				vector3 += Custom.eightDirections[i].ToVector2().normalized;
			}
		}
		if (vector3.magnitude > 0f)
		{
			rootDir = Vector3.Slerp(rootDir, (Custom.DirVec(rootPos, (room.MiddleOfTile(hoverTile) + base.mainBodyChunk.pos) / 2f) + vector3 * 5f).normalized, 0.2f);
		}
		else
		{
			rootDir = Vector3.Slerp(rootDir, Custom.DirVec(rootPos, (room.MiddleOfTile(hoverTile) + base.mainBodyChunk.pos) / 2f), 0.2f);
		}
		if (mode == Mode.Conversing && conversationPartner != null)
		{
			Vector2 vector4 = (base.mainBodyChunk.pos + conversationPartner.mainBodyChunk.pos) / 2f;
			vector4 += Custom.DirVec(vector4, base.mainBodyChunk.pos) * 10f;
			base.mainBodyChunk.vel *= 0.6f;
			base.mainBodyChunk.vel += (vector4 - base.mainBodyChunk.pos) * 0.1f;
		}
		else
		{
			base.mainBodyChunk.vel += Custom.DirVec(base.mainBodyChunk.pos, AI.lookAt) * (Custom.LerpMap(Vector2.Distance(base.mainBodyChunk.pos, AI.lookAt), 30f, 150f, -0.8f, 0.8f) * size);
		}
		AI.Update();
		if (room == null)
		{
			return;
		}
		if (hologram != null && mode == Mode.Watching)
		{
			SwitchModes(Mode.Projecting);
		}
		else if (hologram == null && mode == Mode.Projecting)
		{
			SwitchModes(Mode.Watching);
		}
		if (!(mode == Mode.Watching))
		{
			if (mode == Mode.Withdrawing)
			{
				extended = Mathf.Max(0f, extended - 0.25f);
				if (extended <= 0f)
				{
					SwitchModes(afterWithdrawMode);
				}
			}
			else if (mode == Mode.Zipping)
			{
				if (zipProgs[1] <= 0.5f && zipProgs[0] > 0.5f)
				{
					MidZipSwitch();
				}
				if (zipProgs[0] >= 1f)
				{
					if (leaveRoomOnZipCompletion)
					{
						if (hologram != null)
						{
							hologram.Destroy();
							hologram = null;
						}
						leaveRoomOnZipCompletion = false;
						room.game.shortcuts.CreatureTeleportOutOfRoom(this, base.abstractCreature.pos, base.abstractCreature.abstractAI.destination);
					}
					else
					{
						SwitchModes(Mode.Emerging);
					}
				}
				stationaryCounter = 0;
			}
			else if (mode == Mode.Emerging)
			{
				extended = Mathf.Min(1f, extended + 0.25f);
				base.mainBodyChunk.vel += (room.MiddleOfTile(hoverTile) + Custom.DirVec(room.MiddleOfTile(hoverTile), AI.lookAt) * 30f - base.mainBodyChunk.pos) * 0.05f;
				if (extended >= 1f)
				{
					SwitchModes(Mode.Watching);
					if (ModManager.MSC && !PlayerGuide && !SafariOverseer && room.roomSettings.GetEffectAmount(MoreSlugcatsEnums.RoomEffectType.Advertisements) > 0f)
					{
						TryAddHologram(MoreSlugcatsEnums.OverseerHologramMessage.Advertisement, null, float.MaxValue);
					}
				}
			}
			else if (!(mode == Mode.SittingInWall) && mode == Mode.Conversing && conversationDelay == 0)
			{
				if (conversationPartner != null)
				{
					conversationPartner.SwitchModes(Mode.Watching);
				}
				SwitchModes(Mode.Watching);
			}
		}
		if (mode == Mode.Zipping || mode == Mode.Emerging)
		{
			for (int num2 = zipProgs.Length - 1; num2 >= 1; num2--)
			{
				zipProgs[num2] = zipProgs[num2 - 1];
			}
			zipProgs[0] = Mathf.Min(1f, zipProgs[0] + zipProgSpeed);
		}
	}

	public void SwitchModes(Mode newMode)
	{
		if (base.dead || room == null)
		{
			return;
		}
		if (mode == Mode.Conversing)
		{
			conversationDelay = Random.Range(50, 120);
			lastConversationPartner = conversationPartner;
			conversationPartner = null;
		}
		mode = newMode;
		if (newMode == Mode.Withdrawing)
		{
			for (int i = 0; i < zipProgs.Length; i++)
			{
				zipProgs[i] = 0f;
			}
		}
		if (newMode == Mode.Watching)
		{
			return;
		}
		if (newMode == Mode.Withdrawing)
		{
			if (afterWithdrawMode == Mode.SittingInWall)
			{
				List<IntVector2> list = new List<IntVector2>();
				for (int j = 0; j < 8; j++)
				{
					if (room.GetTile(rootTile + Custom.eightDirectionsAndZero[j]).Solid)
					{
						list.Add(rootTile + Custom.eightDirectionsAndZero[j]);
					}
				}
				zipPath = new List<IntVector2>();
				zipPath.Add(rootTile);
				if (list.Count > 0)
				{
					zipPath.Add(list[Random.Range(0, list.Count)]);
					zipPath.Add(rootTile);
				}
				zipPathCount = zipPath.Count;
			}
			room.PlaySound(SoundID.Overseer_Withdraw, base.mainBodyChunk);
			zipMeshDirection = false;
		}
		else if (newMode == Mode.Zipping)
		{
			zipProgSpeed = 3f / (float)zipPathCount;
			AI.ResetZipPathingMatrix(zipPath[0]);
		}
		else if (newMode == Mode.Emerging)
		{
			room.PlaySound(SoundID.Overseer_Emerge, base.mainBodyChunk);
			rootTile = zipPath[0];
			hoverTile = nextHoverTile;
			rootPos = room.MiddleOfTile(rootTile);
			lastRootPos = rootPos;
			rootDir *= 0f;
			lastRootDir *= 0f;
			base.bodyChunks[0].HardSetPosition(rootPos);
			if (base.graphicsModule != null)
			{
				(base.graphicsModule as OverseerGraphics).Emerge();
			}
		}
		else if (newMode == Mode.SittingInWall)
		{
			zipProgSpeed = 0f;
		}
	}

	public void MidZipSwitch()
	{
		zipMeshDirection = true;
	}

	public void FindZipPath(IntVector2 newRoot, IntVector2 newHover)
	{
		if (newRoot == rootTile)
		{
			return;
		}
		nextHoverTile = newHover;
		IntVector2 intVector = newRoot;
		zipPath = new List<IntVector2> { newRoot };
		zipPathCount = 1;
		for (int i = 0; i < 200; i++)
		{
			float num = float.MaxValue;
			IntVector2 intVector2 = intVector;
			for (int j = 0; j < 8; j++)
			{
				if (intVector.x + Custom.eightDirections[j].x >= 0 && intVector.y + Custom.eightDirections[j].y >= 0 && intVector.x + Custom.eightDirections[j].x < room.TileWidth && intVector.y + Custom.eightDirections[j].y < room.TileHeight && AI.GetZipPathMatrixCell(intVector + Custom.eightDirections[j]) >= 0f && AI.GetZipPathMatrixCell(intVector + Custom.eightDirections[j]) < num)
				{
					num = AI.GetZipPathMatrixCell(intVector + Custom.eightDirections[j]);
					intVector2 = intVector + Custom.eightDirections[j];
				}
			}
			if (intVector == intVector2)
			{
				break;
			}
			intVector = intVector2;
			zipPath.Add(intVector);
			zipPathCount = zipPath.Count;
			if (intVector == rootTile)
			{
				return;
			}
		}
		Custom.LogWarning("OVERSEER FAILED PATHING");
		zipPathCount = room.RayTraceTilesList(newRoot.x, newRoot.y, rootTile.x, rootTile.y, ref zipPath);
	}

	public void ZipOutOfRoom(WorldCoordinate otherRoom)
	{
		InterRoomZipPath(rootTile, otherRoom.room, intoThisRoom: false);
		leaveRoomOnZipCompletion = true;
		afterWithdrawMode = Mode.Zipping;
		SwitchModes(Mode.Withdrawing);
	}

	public void ZipIntoRoom(WorldCoordinate otherRoom)
	{
		InterRoomZipPath(rootTile, otherRoom.room, intoThisRoom: true);
		for (int i = 0; i < zipProgs.Length; i++)
		{
			zipProgs[i] = 0f;
		}
		extended = 0f;
		lastExtended = 0f;
		SwitchModes(Mode.Zipping);
	}

	private void InterRoomZipPath(IntVector2 inThisRoomTile, int otherRoom, bool intoThisRoom)
	{
		if (room == null || otherRoom == room.abstractRoom.index)
		{
			return;
		}
		Vector2 b = room.world.RoomToWorldPos(new Vector2((float)room.world.GetAbstractRoom(otherRoom).size.x * Random.value * 20f, (float)room.world.GetAbstractRoom(otherRoom).size.y * Random.value * 20f), otherRoom);
		IntVector2 intVector = inThisRoomTile;
		zipPath = new List<IntVector2> { inThisRoomTile };
		zipPathCount = 1;
		for (int i = 0; i < 50; i++)
		{
			float num = float.MaxValue;
			IntVector2 intVector2 = intVector;
			for (int j = 0; j < 8; j++)
			{
				bool flag = false;
				int num2 = intVector.x + Custom.eightDirections[j].x;
				int num3 = intVector.y + Custom.eightDirections[j].y;
				for (int k = 0; k < zipPathCount; k++)
				{
					if (zipPath[k].x == num2 && zipPath[k].y == num3)
					{
						flag = true;
						break;
					}
				}
				if (!flag)
				{
					float num4 = (room.GetTile(intVector + Custom.eightDirections[j]).Solid ? 0f : 100000f);
					num4 += Vector2.Distance(room.world.RoomToWorldPos(room.MiddleOfTile(intVector + Custom.eightDirections[j]), room.abstractRoom.index), b);
					num4 += Random.value;
					if (num4 < num)
					{
						num = num4;
						intVector2 = intVector + Custom.eightDirections[j];
					}
				}
			}
			if (intVector == intVector2 || num == float.MaxValue)
			{
				break;
			}
			intVector = intVector2;
			zipPath.Add(intVector);
			zipPathCount = zipPath.Count;
		}
		if (!intoThisRoom)
		{
			zipPath.Reverse();
		}
	}

	public override void Die()
	{
		if (SafariOverseer || SandboxOverseer)
		{
			return;
		}
		if (!base.dead && PlayerGuide)
		{
			if (killTag != null && killTag.creatureTemplate.type == CreatureTemplate.Type.Slugcat && room.game.session is StoryGameSession && room.ViewedByAnyCamera(base.firstChunk.pos, 0f) && (!ModManager.MSC || room.game.StoryCharacter != MoreSlugcatsEnums.SlugcatStatsName.Spear))
			{
				Custom.Log("player guide killed by player - gone till next cycle");
			}
			else
			{
				AbstractCreature abstractCreature = new AbstractCreature(base.abstractCreature.world, StaticWorld.GetCreatureTemplate(CreatureTemplate.Type.Overseer), null, new WorldCoordinate(base.abstractCreature.world.offScreenDen.index, -1, -1, 0), new EntityID(-1, 5));
				base.abstractCreature.world.offScreenDen.entitiesInDens.Add(abstractCreature);
				(abstractCreature.abstractAI as OverseerAbstractAI).SetAsPlayerGuide((!ModManager.MSC) ? 1 : (base.abstractCreature.abstractAI as OverseerAbstractAI).ownerIterator);
				Custom.Log("------Player guide respawned in offscreen den.");
			}
		}
		if (hologram != null)
		{
			hologram.Destroy();
			hologram = null;
		}
		base.Die();
	}

	public override void HitByWeapon(Weapon weapon)
	{
		base.HitByWeapon(weapon);
		if (PlayerGuide && weapon.thrownBy != null && weapon.thrownBy.Template.type == CreatureTemplate.Type.Slugcat)
		{
			(base.abstractCreature.world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.InfluenceLike(-0.1f, base.abstractCreature.world.game.devToolsActive);
			(base.abstractCreature.world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.increaseLikeOnSave = false;
			if ((base.abstractCreature.abstractAI as OverseerAbstractAI).goToPlayer)
			{
				(base.abstractCreature.abstractAI as OverseerAbstractAI).playerGuideCounter /= 4;
			}
			if ((base.abstractCreature.world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.likesPlayer < -0.5f)
			{
				(base.abstractCreature.abstractAI as OverseerAbstractAI).PlayerGuideGoAway(Random.Range(200, 1500));
			}
		}
	}

	public Vector2 AppendagePosition(int appendage, int segment)
	{
		if (extended < 0.2f)
		{
			return new Vector2(-10000f, -10000f);
		}
		if (base.graphicsModule == null)
		{
			return Vector2.Lerp(rootPos, base.mainBodyChunk.pos, (float)segment / (float)(appendages[0].segments.Length - 1));
		}
		return (base.graphicsModule as OverseerGraphics).DrawPosOfSegment((float)segment / (float)(appendages[0].segments.Length - 1), 1f);
	}

	public void ApplyForceOnAppendage(Appendage.Pos pos, Vector2 momentum)
	{
		base.mainBodyChunk.vel += momentum / base.mainBodyChunk.mass;
	}

	public void TeleportingIntoRoom(Room newRoom)
	{
		PlaceInRoom(newRoom);
		ZipIntoRoom((base.abstractCreature.abstractAI as OverseerAbstractAI).lastRoom);
	}

	public override bool SpearStick(Weapon source, float dmg, BodyChunk chunk, Appendage.Pos appPos, Vector2 direction)
	{
		return false;
	}

	public void FlyingWeapon(Weapon weapon)
	{
		AI.FlyingWeapon(weapon);
	}

	public void PlayHUDSound(SoundID soundID)
	{
		base.abstractCreature.world.game.cameras[0].virtualMicrophone.PlaySound(soundID, 0f, 1f, 1f);
	}

	public global::HUD.HUD.OwnerType GetOwnerType()
	{
		if (!ModManager.MSC)
		{
			return global::HUD.HUD.OwnerType.ArenaSession;
		}
		return MoreSlugcatsEnums.OwnerType.SafariOverseer;
	}

	public void FoodCountDownDone()
	{
	}

	public void ZipToPosition(Vector2 destPos)
	{
		if (!(mode != Mode.Emerging) || !(mode != Mode.Withdrawing) || !(mode != Mode.Zipping))
		{
			return;
		}
		IntVector2 intVector = new IntVector2((int)(destPos.x / 20f), (int)(destPos.y / 20f));
		IntVector2? intVector2 = AI.FindRootTileForHoverPos(intVector);
		if (intVector2.HasValue && AI.GetZipPathMatrixCell(intVector2.Value) >= 0f && AI.GetZipPathMatrixCell(intVector2.Value) < float.MaxValue)
		{
			AI.avoidPositions.Clear();
			hoverTile = intVector;
			nextHoverTile = intVector;
			AI.tempHoverTile = intVector;
			WorldCoordinate newDest = new WorldCoordinate(base.abstractCreature.Room.index, intVector2.Value.x, intVector2.Value.y, -1);
			base.abstractCreature.abstractAI.SetDestinationNoPathing(newDest, migrate: false);
			FindZipPath(intVector2.Value, intVector);
			if (mode == Mode.SittingInWall)
			{
				SwitchModes(Mode.Zipping);
				return;
			}
			afterWithdrawMode = Mode.Zipping;
			SwitchModes(Mode.Withdrawing);
		}
		else if (intVector2.HasValue)
		{
			HardSetTile(intVector, intVector2.Value);
		}
	}

	public override void Violence(BodyChunk source, Vector2? directionAndMomentum, BodyChunk hitChunk, Appendage.Pos hitAppendage, DamageType type, float damage, float stunBonus)
	{
		if (RippleViolenceCheck(source) && !SafariOverseer && !SandboxOverseer)
		{
			base.Violence(source, directionAndMomentum, hitChunk, hitAppendage, type, damage, stunBonus);
		}
	}
}
