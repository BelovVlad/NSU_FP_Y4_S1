using System;
using System.Collections.Generic;
using MoreSlugcats;
using OverseerHolograms;
using RWCustom;
using ScavTradeInstruction;
using UnityEngine;

public class OverseerCommunicationModule : AIModule
{
	public class PlayerConcern : ExtEnum<PlayerConcern>
	{
		public static readonly PlayerConcern None = new PlayerConcern("None", register: true);

		public static readonly PlayerConcern Bats = new PlayerConcern("Bats", register: true);

		public static readonly PlayerConcern Shelter = new PlayerConcern("Shelter", register: true);

		public static readonly PlayerConcern DangerousCreature = new PlayerConcern("DangerousCreature", register: true);

		public static readonly PlayerConcern Progression = new PlayerConcern("Progression", register: true);

		public static readonly PlayerConcern ShowGateScene = new PlayerConcern("ShowGateScene", register: true);

		public static readonly PlayerConcern ShowPlacedScene = new PlayerConcern("ShowPlacedScene", register: true);

		public static readonly PlayerConcern ForcedDirection = new PlayerConcern("ForcedDirection", register: true);

		public static readonly PlayerConcern FoodItemInRoom = new PlayerConcern("FoodItemInRoom", register: true);

		public static readonly PlayerConcern InputInstruction = new PlayerConcern("InputInstruction", register: true);

		public static readonly PlayerConcern Anger = new PlayerConcern("Anger", register: true);

		public PlayerConcern(string value, bool register = false)
			: base(value, register)
		{
		}
	}

	public HologramLight holoLight;

	public PlayerConcern currentConcern;

	public float currentConcernWeight;

	public List<EntityID> objectsAlreadyTalkedAbout;

	public bool hasAlreadyShowedPlayerToAShelter;

	public AbstractCreature mostDangerousCreatureInRoom;

	public float mostDangerousCreatureDanger;

	public AbstractPhysicalObject mostDeliciousFoodInRoom;

	public float mostDelicousFoodDelicious;

	public ShowProjectedImageEvent imageToShow;

	public int showImageRoom = -1;

	public ReliableIggyDirection forcedDirectionToGive;

	public int noBatDirectionFromRoom = -1;

	public int noShelterDirectionFromRoom = -1;

	public int noProgressionDirectionFromRoom = -1;

	public int playerRoom = -1;

	public int lastPlayerRoom = -1;

	public int followGivenDirectionStreak;

	public int freeMovementStreak;

	public int unWantedSwarmRoom = -1;

	public int unWantedShelter = -1;

	private float generalHandHolding = 0.5f;

	public InputInstructionTrigger inputInstruction;

	private float progressionShowTendency;

	public bool firstFewCycles;

	public int showedImageTime;

	public OverseerAI overseerAI => AI as OverseerAI;

	public PlayerGuideState GuideState => (overseerAI.creature.world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState;

	public Room room => overseerAI.overseer.room;

	public Player player => room.game.Players[0].realizedCreature as Player;

	public bool PlayerOpenForCommunication
	{
		get
		{
			if (!player.dead)
			{
				return player.grabbedBy.Count == 0;
			}
			return false;
		}
	}

	public bool WantToShowImage(string roomName)
	{
		if (overseerAI.overseer.hologram == null || !(overseerAI.overseer.hologram.message == OverseerHologram.Message.GateScene))
		{
			return !GuideState.HasImageBeenShownInRoom(roomName);
		}
		return true;
	}

	public OverseerCommunicationModule(OverseerAI AI)
		: base(AI)
	{
		objectsAlreadyTalkedAbout = new List<EntityID>();
		firstFewCycles = AI.worldAI.world.game.GetStorySession.saveState.cycleNumber > 0 && AI.worldAI.world.game.GetStorySession.saveState.cycleNumber < 4;
	}

	public override void Update()
	{
		if (room != null && room.game.Players.Count != 0 && room.game.Players[0].realizedCreature != null && room.game.Players[0].realizedCreature.room == room && ((ModManager.MMF && (!MMF.cfgExtraTutorials.Value || room.abstractRoom.gate)) || overseerAI.tutorialBehavior == null) && (!ModManager.MMF || !MMF.cfgExtraTutorials.Value || !room.abstractRoom.gate || overseerAI.tutorialBehavior == null || room.regionGate == null || !room.regionGate.MeetRequirement) && ((GuideState.angryWithPlayer && !GuideState.displayedAnger) || !(overseerAI.LikeOfPlayer(room.game.Players[0]) < 0.5f)))
		{
			if (holoLight != null && (holoLight.room != room || holoLight.slatedForDeletetion))
			{
				holoLight = null;
			}
			ReevaluateConcern(room.game.Players[0].realizedCreature as Player);
		}
	}

	public void ReevaluateConcern(Player player)
	{
		if (player.room != null && player.room.abstractRoom.index != playerRoom)
		{
			lastPlayerRoom = playerRoom;
			playerRoom = player.room.abstractRoom.index;
			generalHandHolding = 0.5f * Mathf.Pow(GuideState.handHolding, 0.2f) + 0.5f * Mathf.InverseLerp(0.5f, -0.5f, (overseerAI.creature.world.game.session as StoryGameSession).saveState.deathPersistentSaveData.howWellIsPlayerDoing);
			if (room.world.overseersWorldAI.directionFinder != null && room.world.overseersWorldAI.directionFinder.done)
			{
				if (ModManager.MSC && overseerAI.creature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Spear)
				{
					progressionShowTendency = 1f;
				}
				else if (room.world.region.name == "SL" || room.world.region.name == "SH" || (ModManager.MSC && room.world.region.name == "RM"))
				{
					progressionShowTendency = 1f;
				}
				else
				{
					float num = float.MaxValue;
					for (int i = 0; i < room.abstractRoom.connections.Length; i++)
					{
						if (room.world.overseersWorldAI.directionFinder.DistanceToDestination(new WorldCoordinate(room.abstractRoom.index, -1, -1, i)) < num)
						{
							num = room.world.overseersWorldAI.directionFinder.DistanceToDestination(new WorldCoordinate(room.abstractRoom.index, -1, -1, i));
						}
					}
					progressionShowTendency = Mathf.InverseLerp(400f, 200f, num);
					if ((overseerAI.creature.world.game.session as StoryGameSession).saveState.deathPersistentSaveData.karma == (overseerAI.creature.world.game.session as StoryGameSession).saveState.deathPersistentSaveData.karmaCap)
					{
						progressionShowTendency = Mathf.Lerp(progressionShowTendency, 1f, 0.5f);
					}
					if (ModManager.MSC && (overseerAI.creature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Rivulet || overseerAI.creature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Artificer) && progressionShowTendency < 0.2f)
					{
						progressionShowTendency = 0.2f;
					}
				}
			}
			else
			{
				progressionShowTendency = 0f;
			}
			showedImageTime = 0;
		}
		currentConcern = PlayerConcern.None;
		currentConcernWeight = Mathf.Pow(Mathf.InverseLerp(1f, 0.5f, overseerAI.LikeOfPlayer(player.abstractCreature)), 6f);
		currentConcernWeight = Mathf.Lerp(1f, currentConcernWeight, generalHandHolding);
		if (player.Consious && PlayerOpenForCommunication)
		{
			if ((overseerAI.creature.world.game.session as StoryGameSession).saveState.dreamsState != null)
			{
				(overseerAI.creature.world.game.session as StoryGameSession).saveState.dreamsState.guideHasShownHimselfToPlayer = true;
			}
			float num2 = PlayerShelterNeed(player);
			if (num2 > currentConcernWeight)
			{
				currentConcernWeight = num2;
				currentConcern = PlayerConcern.Shelter;
			}
			float num3 = PlayerBatsNeed(player);
			if (num3 > currentConcernWeight)
			{
				currentConcernWeight = num3;
				currentConcern = PlayerConcern.Bats;
			}
			if (progressionShowTendency > 0f)
			{
				float num4 = PlayerProgressionNeed(player);
				if (num4 > currentConcernWeight)
				{
					currentConcernWeight = num4;
					currentConcern = PlayerConcern.Progression;
				}
			}
		}
		if (inputInstruction != null)
		{
			if (inputInstruction.completed || inputInstruction.slatedForDeletetion || inputInstruction.room != overseerAI.overseer.room)
			{
				inputInstruction = null;
			}
			else if (room.ViewedByAnyCamera(inputInstruction.instructionPos, 20f))
			{
				float num5 = 0.7f;
				if (num5 > currentConcernWeight)
				{
					currentConcernWeight = num5;
					currentConcern = PlayerConcern.InputInstruction;
				}
			}
		}
		AbstractCreature abstractCreature = room.abstractRoom.creatures[UnityEngine.Random.Range(0, room.abstractRoom.creatures.Count)];
		mostDangerousCreatureDanger = CreatureDangerScore(mostDangerousCreatureInRoom, player);
		float num6 = CreatureDangerScore(abstractCreature, player);
		if (num6 > mostDangerousCreatureDanger * 1.1f)
		{
			mostDangerousCreatureInRoom = abstractCreature;
			mostDangerousCreatureDanger = num6;
		}
		if (mostDangerousCreatureDanger == 0f)
		{
			mostDangerousCreatureInRoom = null;
		}
		else if (mostDangerousCreatureDanger > currentConcernWeight)
		{
			currentConcernWeight = mostDangerousCreatureDanger;
			currentConcern = PlayerConcern.DangerousCreature;
		}
		if (abstractCreature.realizedCreature != null && UnityEngine.Random.value < 0.025f && CreatureAnyPotentialDangerAtAll(abstractCreature) && room.ViewedByAnyCamera(abstractCreature.realizedCreature.mainBodyChunk.pos, -10f) && GuideState.creatureTypes.Contains(abstractCreature.creatureTemplate.type))
		{
			PlayerHasNowBeenWarnedOfCreature(abstractCreature, creatureTypeNowHandled: false);
		}
		if (player.FoodInStomach < player.slugcatStats.foodToHibernate)
		{
			AbstractWorldEntity abstractWorldEntity = room.abstractRoom.entities[UnityEngine.Random.Range(0, room.abstractRoom.entities.Count)];
			mostDelicousFoodDelicious = FoodDelicousScore(mostDeliciousFoodInRoom, player);
			if (abstractWorldEntity is AbstractPhysicalObject && FoodDelicousScore(abstractWorldEntity as AbstractPhysicalObject, player) > mostDelicousFoodDelicious * 1.1f)
			{
				mostDeliciousFoodInRoom = abstractWorldEntity as AbstractPhysicalObject;
				mostDelicousFoodDelicious = FoodDelicousScore(abstractWorldEntity as AbstractPhysicalObject, player);
			}
			if (mostDelicousFoodDelicious == 0f)
			{
				mostDeliciousFoodInRoom = null;
			}
			else if (mostDelicousFoodDelicious > currentConcernWeight)
			{
				currentConcernWeight = mostDelicousFoodDelicious;
				currentConcern = PlayerConcern.FoodItemInRoom;
			}
			if (mostDeliciousFoodInRoom != null && !GuideState.itemTypes.Contains(mostDeliciousFoodInRoom.type) && mostDeliciousFoodInRoom.realizedObject != null)
			{
				if (mostDeliciousFoodInRoom.realizedObject.grabbedBy.Count > 0 && mostDeliciousFoodInRoom.realizedObject.grabbedBy[0].grabber is Player)
				{
					GuideState.itemTypes.Add(mostDeliciousFoodInRoom.type);
					Custom.Log($"player has learnt about {mostDeliciousFoodInRoom.type}");
				}
				else if (mostDeliciousFoodInRoom.type == AbstractPhysicalObject.AbstractObjectType.SeedCob && mostDeliciousFoodInRoom.realizedObject != null && (mostDeliciousFoodInRoom.realizedObject as SeedCob).open > 0.5f)
				{
					GuideState.itemTypes.Add(mostDeliciousFoodInRoom.type);
					Custom.Log("player has learnt about seed cobs");
				}
			}
		}
		else
		{
			mostDeliciousFoodInRoom = null;
			mostDelicousFoodDelicious = 0f;
		}
		if (GuideState.angryWithPlayer && !GuideState.displayedAnger)
		{
			currentConcernWeight = 1f;
			currentConcern = PlayerConcern.Anger;
		}
		if (ModManager.MMF && MMF.cfgExtraTutorials.Value && room.abstractRoom.gate && (room.abstractRoom.name == "GATE_SU_DS" || (room.abstractRoom.name == "GATE_SU_HI" && GuideState.HasImageBeenShownInRoom("GATE_SU_HI"))) && !room.game.GetStorySession.saveState.deathPersistentSaveData.GateStandTutorial && room.regionGate != null && !room.regionGate.MeetRequirement)
		{
			currentConcern = PlayerConcern.ShowGateScene;
			currentConcernWeight = 1f;
		}
		else if (room.abstractRoom.gate && !(room.game.session as StoryGameSession).saveState.miscWorldSaveData.EverMetMoon && (room.abstractRoom.name == "GATE_SU_HI" || room.abstractRoom.name == "GATE_HI_GW" || room.abstractRoom.name == "GATE_GW_SL" || room.abstractRoom.name == "GATE_SH_SL" || (ModManager.MSC && room.abstractRoom.name == "GATE_SL_VS")) && room.world.region.name == room.abstractRoom.name.Split('_')[1])
		{
			if (WantToShowImage(room.abstractRoom.name) && room.regionGate != null && room.regionGate.mode != RegionGate.Mode.Closed)
			{
				currentConcern = PlayerConcern.ShowGateScene;
				currentConcernWeight = 1f;
			}
			else
			{
				currentConcern = PlayerConcern.None;
			}
		}
		else if (imageToShow != null)
		{
			if (room.abstractRoom.index == showImageRoom && WantToShowImage(room.abstractRoom.name))
			{
				if (currentConcernWeight < 0.99f)
				{
					currentConcern = PlayerConcern.ShowPlacedScene;
					currentConcernWeight = 0.99f;
				}
			}
			else
			{
				imageToShow = null;
			}
		}
		else if (forcedDirectionToGive != null)
		{
			if (forcedDirectionToGive.room == room)
			{
				if (currentConcernWeight < 0.98f)
				{
					currentConcern = PlayerConcern.ForcedDirection;
					currentConcernWeight = 0.98f;
				}
			}
			else
			{
				forcedDirectionToGive = null;
			}
		}
		if (ModManager.MMF && MMF.cfgExtraTutorials.Value && !overseerAI.overseer.forceShelterNeed && room.abstractRoom.name == "SL_AI" && room.game.IsStorySession && room.game.StoryCharacter != SlugcatStats.Name.Red)
		{
			Oracle oracle = null;
			for (int j = 0; j < room.physicalObjects.Length; j++)
			{
				for (int k = 0; k < room.physicalObjects[j].Count; k++)
				{
					if (room.physicalObjects[j][k] is Oracle)
					{
						oracle = room.physicalObjects[j][k] as Oracle;
						break;
					}
				}
				if (oracle != null)
				{
					break;
				}
			}
			if (oracle != null && oracle.oracleBehavior is SLOracleBehaviorNoMark)
			{
				SLOracleBehaviorNoMark sLOracleBehaviorNoMark = oracle.oracleBehavior as SLOracleBehaviorNoMark;
				if (sLOracleBehaviorNoMark.State.playerEncounters <= 1 && !sLOracleBehaviorNoMark.protest && sLOracleBehaviorNoMark.protest)
				{
					currentConcern = MMFEnums.PlayerConcern.ProtectMoon;
					currentConcernWeight = 1f;
				}
			}
		}
		if (currentConcern == PlayerConcern.None || !PlayerOpenForCommunication)
		{
			if (overseerAI.overseer.hologram != null)
			{
				overseerAI.overseer.hologram.stillRelevant = false;
			}
			return;
		}
		(overseerAI.creature.abstractAI as OverseerAbstractAI).playerGuideCounter = 100;
		(overseerAI.creature.abstractAI as OverseerAbstractAI).goToPlayer = true;
		if (currentConcern == PlayerConcern.Bats)
		{
			if (player.room.world.fliesWorldAI.ActiveSwarmRoom(player.room.abstractRoom))
			{
				GuideState.hasBeenToASwarmRoomThisCycle = true;
			}
			else
			{
				overseerAI.overseer.TryAddHologram(OverseerHologram.Message.Bats, player, currentConcernWeight);
			}
		}
		else if (currentConcern == PlayerConcern.Shelter)
		{
			overseerAI.overseer.TryAddHologram(OverseerHologram.Message.Shelter, player, currentConcernWeight);
		}
		else if (currentConcern == PlayerConcern.DangerousCreature)
		{
			overseerAI.overseer.TryAddHologram(OverseerHologram.Message.DangerousCreature, player, currentConcernWeight);
		}
		else if (currentConcern == PlayerConcern.Progression)
		{
			overseerAI.overseer.TryAddHologram(OverseerHologram.Message.ProgressionDirection, player, currentConcernWeight);
		}
		else if (currentConcern == PlayerConcern.ShowGateScene || currentConcern == PlayerConcern.ShowPlacedScene)
		{
			overseerAI.overseer.TryAddHologram(OverseerHologram.Message.GateScene, player, currentConcernWeight);
		}
		else if (currentConcern == PlayerConcern.FoodItemInRoom)
		{
			overseerAI.overseer.TryAddHologram(OverseerHologram.Message.FoodObject, player, currentConcernWeight);
		}
		else if (currentConcern == PlayerConcern.InputInstruction)
		{
			if (inputInstruction != null)
			{
				if (inputInstruction is SuperJumpInstruction)
				{
					overseerAI.overseer.TryAddHologram(OverseerHologram.Message.InWorldSuperJump, player, currentConcernWeight);
				}
				else if (inputInstruction is PickupObjectInstruction)
				{
					overseerAI.overseer.TryAddHologram(OverseerHologram.Message.PickupObject, player, currentConcernWeight);
				}
				else if (inputInstruction is ScavengerTradeInstructionTrigger)
				{
					overseerAI.overseer.TryAddHologram(OverseerHologram.Message.ScavengerTrade, player, currentConcernWeight);
				}
			}
		}
		else if (currentConcern == PlayerConcern.Anger)
		{
			overseerAI.overseer.TryAddHologram(OverseerHologram.Message.Angry, player, currentConcernWeight);
		}
		else if (currentConcern == PlayerConcern.ForcedDirection)
		{
			overseerAI.overseer.TryAddHologram(OverseerHologram.Message.ForcedDirection, player, currentConcernWeight);
		}
		else if (ModManager.MMF && MMF.cfgExtraTutorials.Value && currentConcern == MMFEnums.PlayerConcern.ProtectMoon)
		{
			overseerAI.overseer.TryAddHologram(OverseerHologram.Message.GateScene, player, currentConcernWeight);
		}
	}

	private float PlayerShelterNeed(Player player)
	{
		if (player.room.abstractRoom.index == noShelterDirectionFromRoom)
		{
			return 0f;
		}
		if (overseerAI.overseer.forceShelterNeed)
		{
			return 1f;
		}
		if (firstFewCycles)
		{
			if (player.FoodInStomach < player.slugcatStats.foodToHibernate)
			{
				return 0f;
			}
			return 0.69f;
		}
		float num = 0f;
		num = ((player.FoodInStomach < player.slugcatStats.foodToHibernate || hasAlreadyShowedPlayerToAShelter) ? (Mathf.InverseLerp(4800f, 2400f, player.room.world.rainCycle.TimeUntilRain) * 0.35f) : Mathf.InverseLerp(30 * (6 + player.FoodInStomach) * 40, 2400f, player.room.world.rainCycle.TimeUntilRain));
		return num * (Mathf.Pow(GuideState.handHolding, 0.4f) * GuideState.wantShelterHandHoldingThisCycle);
	}

	private float PlayerBatsNeed(Player player)
	{
		if (player.room.abstractRoom.index == noBatDirectionFromRoom)
		{
			return 0f;
		}
		if (player.FoodInStomach >= player.slugcatStats.foodToHibernate)
		{
			return 0f;
		}
		if (firstFewCycles)
		{
			if (player.FoodInStomach < player.slugcatStats.foodToHibernate)
			{
				return 0.69f;
			}
			return 0f;
		}
		float num = GeneralPlayerFoodNeed(player);
		if (GuideState.hasBeenToASwarmRoomThisCycle)
		{
			num *= 0.2f;
		}
		return num * GuideState.wantFoodHandHoldingThisCycle;
	}

	private float GeneralPlayerFoodNeed(Player player)
	{
		if (firstFewCycles)
		{
			if (player.FoodInStomach < player.slugcatStats.foodToHibernate)
			{
				return 0.69f;
			}
			return 0f;
		}
		return Mathf.InverseLerp(1600f, 40f * Mathf.Lerp(280f, 80f, GuideState.handHolding), player.room.world.rainCycle.timer) * Mathf.Pow(Mathf.Sin(player.room.world.rainCycle.CycleProgression * (float)Math.PI), 1 + player.FoodInStomach) * GuideState.handHolding * Custom.LerpMap(player.FoodInStomach, 0f, player.slugcatStats.foodToHibernate - 1, 1f, 0.5f) * (GuideState.hasBeenToASwarmRoomThisCycle ? 0.5f : 1f);
	}

	public bool AnyProgressionDirection(Player player)
	{
		if (player == null || firstFewCycles)
		{
			return false;
		}
		if (overseerAI.worldAI == null || overseerAI.worldAI.directionFinder == null)
		{
			return false;
		}
		if (player.room != null && player.room.abstractRoom.index == noProgressionDirectionFromRoom)
		{
			return false;
		}
		if (player.room != null && player.room.abstractRoom.index == overseerAI.worldAI.directionFinder.showToRoom)
		{
			return false;
		}
		if (player.Karma < overseerAI.worldAI.directionFinder.minKarma)
		{
			return !overseerAI.worldAI.directionFinder.DestinationRoomVisisted;
		}
		return true;
	}

	private float PlayerProgressionNeed(Player player)
	{
		if (!AnyProgressionDirection(player) || firstFewCycles)
		{
			return 0f;
		}
		return Custom.LerpMap(player.FoodInStomach, 0f, 4f, 0.6f, 1f) * Mathf.Pow(Mathf.Sin(player.room.world.rainCycle.CycleProgression * (float)Math.PI), 0.5f) * (0.2f + 0.8f * GuideState.wantDirectionHandHoldingThisCycle) * progressionShowTendency;
	}

	private bool CreatureAnyPotentialDangerAtAll(AbstractCreature creature)
	{
		if (creature == null)
		{
			return false;
		}
		if (creature.creatureTemplate.smallCreature)
		{
			return false;
		}
		if (creature.Room != player.room.abstractRoom)
		{
			return false;
		}
		if (creature.realizedCreature == null)
		{
			return false;
		}
		if (creature.realizedCreature.slatedForDeletetion)
		{
			return false;
		}
		if (creature.realizedCreature.dead)
		{
			return false;
		}
		return true;
	}

	private float CreatureDangerScore(AbstractCreature creature, Player player)
	{
		if (!CreatureAnyPotentialDangerAtAll(creature))
		{
			return 0f;
		}
		bool flag = player.room.ViewedByAnyCamera(creature.realizedCreature.DangerPos, 60f);
		if (creature.creatureTemplate.type == CreatureTemplate.Type.PoleMimic && (creature.realizedCreature as PoleMimic).mimic > 0.5f)
		{
			flag = false;
		}
		if (GuideState.creatureTypes.Contains(creature.creatureTemplate.type) && flag)
		{
			return 0f;
		}
		float num = creature.creatureTemplate.dangerousToPlayer;
		if (creature.creatureTemplate.type == CreatureTemplate.Type.Scavenger)
		{
			num = 1f;
		}
		if (num == 0f)
		{
			return 0f;
		}
		if (creature.abstractAI != null && creature.abstractAI.RealAI != null)
		{
			num *= creature.abstractAI.RealAI.CurrentPlayerAggression(player.abstractCreature);
		}
		num *= Mathf.InverseLerp(1100f, 20f, Vector2.Distance(creature.realizedCreature.DangerPos, player.DangerPos));
		if (num == 0f)
		{
			return 0f;
		}
		for (int i = 0; i < objectsAlreadyTalkedAbout.Count; i++)
		{
			if (objectsAlreadyTalkedAbout[i] == creature.ID)
			{
				return 0f;
			}
		}
		return Mathf.Pow(num, Mathf.Lerp(1.25f, 0.25f, GuideState.handHolding));
	}

	public float FoodDelicousScore(AbstractPhysicalObject foodObject, Player player)
	{
		if (foodObject == null || foodObject.realizedObject == null || foodObject.Room != player.abstractCreature.Room || foodObject.slatedForDeletion)
		{
			return 0f;
		}
		if (foodObject.type != AbstractPhysicalObject.AbstractObjectType.DangleFruit && foodObject.type != AbstractPhysicalObject.AbstractObjectType.JellyFish && foodObject.type != AbstractPhysicalObject.AbstractObjectType.SeedCob && foodObject.type != AbstractPhysicalObject.AbstractObjectType.WaterNut)
		{
			return 0f;
		}
		float num = Mathf.InverseLerp(1100f, 400f, Vector2.Distance(foodObject.realizedObject.firstChunk.pos, player.DangerPos));
		if (num == 0f)
		{
			return 0f;
		}
		if (GuideState.itemTypes.Contains(foodObject.type))
		{
			if (!(num > 0.2f) || !room.ViewedByAnyCamera(foodObject.realizedObject.firstChunk.pos, 0f))
			{
				return 0f;
			}
			num = 0.3f;
		}
		for (int i = 0; i < objectsAlreadyTalkedAbout.Count; i++)
		{
			if (objectsAlreadyTalkedAbout[i] == foodObject.ID)
			{
				return 0f;
			}
		}
		if (foodObject == mostDeliciousFoodInRoom && currentConcern == PlayerConcern.FoodItemInRoom)
		{
			num *= 1.1f;
		}
		if (foodObject.type == AbstractPhysicalObject.AbstractObjectType.SeedCob)
		{
			if ((foodObject as SeedCob.AbstractSeedCob).dead)
			{
				return 0f;
			}
			if ((foodObject as SeedCob.AbstractSeedCob).opened)
			{
				num = Mathf.Lerp(num, 1f, 0.7f);
			}
		}
		return num * Mathf.Lerp(GeneralPlayerFoodNeed(player), 0.6f, 0.5f);
	}

	public void PlayerHasNowBeenWarnedOfCreature(AbstractCreature creature, bool creatureTypeNowHandled)
	{
		Custom.Log("creature talked about:", creature.ToString(), creatureTypeNowHandled.ToString());
		if (creatureTypeNowHandled && !GuideState.creatureTypes.Contains(creature.creatureTemplate.type))
		{
			GuideState.creatureTypes.Add(creature.creatureTemplate.type);
		}
		for (int i = 0; i < objectsAlreadyTalkedAbout.Count; i++)
		{
			if (creature.ID == objectsAlreadyTalkedAbout[i])
			{
				return;
			}
		}
		if (objectsAlreadyTalkedAbout.Count > 20)
		{
			objectsAlreadyTalkedAbout.RemoveAt(0);
		}
		objectsAlreadyTalkedAbout.Add(creature.ID);
	}

	public void PlayerHasBeenToldAboutFood(AbstractPhysicalObject foodItem)
	{
		for (int i = 0; i < objectsAlreadyTalkedAbout.Count; i++)
		{
			if (foodItem.ID == objectsAlreadyTalkedAbout[i])
			{
				return;
			}
		}
		if (objectsAlreadyTalkedAbout.Count > 10)
		{
			objectsAlreadyTalkedAbout.RemoveAt(0);
		}
		objectsAlreadyTalkedAbout.Add(foodItem.ID);
	}

	public void PlayerIsFollowingADirection(OverseerHologram.Message message)
	{
		followGivenDirectionStreak++;
		freeMovementStreak = 0;
		Custom.Log("player IS following a direction");
		if (followGivenDirectionStreak > 2)
		{
			GuideState.InfluenceHandHolding(0.1f, AI.creature.world.game.devToolsActive);
		}
		if (message == OverseerHologram.Message.Bats)
		{
			GuideState.wantFoodHandHoldingThisCycle = Mathf.Clamp(GuideState.wantFoodHandHoldingThisCycle + 0.1f, 0f, 1f);
		}
		else if (message == OverseerHologram.Message.Shelter)
		{
			GuideState.wantShelterHandHoldingThisCycle = Mathf.Clamp(GuideState.wantShelterHandHoldingThisCycle + 0.1f, 0f, 1f);
		}
		else if (message == OverseerHologram.Message.ProgressionDirection)
		{
			GuideState.wantDirectionHandHoldingThisCycle = Mathf.Clamp(GuideState.wantDirectionHandHoldingThisCycle + 0.1f, 0f, 1f);
		}
	}

	public void PlayerNOTfollowingADirection(OverseerHologram.Message message, bool explicitlyVisibleInstruction)
	{
		freeMovementStreak++;
		followGivenDirectionStreak = 0;
		Custom.Log("player is NOT following a direction");
		GuideState.InfluenceHandHolding(explicitlyVisibleInstruction ? (-0.05f) : (-0.025f), AI.creature.world.game.devToolsActive);
		if (message == OverseerHologram.Message.Bats)
		{
			GuideState.wantFoodHandHoldingThisCycle = Mathf.Clamp(GuideState.wantFoodHandHoldingThisCycle - (explicitlyVisibleInstruction ? 0.1f : 0.05f), 0f, 1f);
		}
		else if (message == OverseerHologram.Message.Shelter)
		{
			GuideState.wantShelterHandHoldingThisCycle = Mathf.Clamp(GuideState.wantShelterHandHoldingThisCycle - (explicitlyVisibleInstruction ? 0.1f : 0.05f), 0f, 1f);
		}
		else if (message == OverseerHologram.Message.ProgressionDirection)
		{
			GuideState.wantDirectionHandHoldingThisCycle = Mathf.Clamp(GuideState.wantDirectionHandHoldingThisCycle - (explicitlyVisibleInstruction ? 0.1f : 0.05f), 0f, 1f);
		}
	}

	public void InWorldInputInstructionCompleted(InputInstructionTrigger instruction)
	{
		Custom.Log("input instruction completed");
		if (inputInstruction is SuperJumpInstruction)
		{
			GuideState.superJumpsShown++;
		}
		else if (inputInstruction is PickupObjectInstruction)
		{
			GuideState.pickupObjectsShown++;
		}
		else if (inputInstruction is ScavengerTradeInstructionTrigger)
		{
			GuideState.scavTradeInstructionCompleted = true;
		}
	}

	public void PlayerNeedsInputInstruction(InputInstructionTrigger instruction)
	{
		if ((!(instruction is SuperJumpInstruction) || GuideState.superJumpsShown <= 3) && (!(instruction is PickupObjectInstruction) || GuideState.pickupObjectsShown <= 0) && (!(instruction is ScavengerTradeInstructionTrigger) || !GuideState.scavTradeInstructionCompleted))
		{
			inputInstruction = instruction;
		}
	}
}
