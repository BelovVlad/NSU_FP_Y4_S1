using System;
using System.Collections.Generic;
using MoreSlugcats;
using RWCustom;
using UnityEngine;
using Watcher;

public class OverseerAbstractAI : AbstractCreatureAI
{
	public new WorldCoordinate lastRoom;

	public List<int> lastRooms;

	public AbstractCreature targetCreature;

	public bool goToPlayer;

	public int playerGuideCounter;

	public int targetCreatureCounter;

	public AbstractCreature lastTargetCreature;

	public OverseersWorldAI worldAI;

	public int freezeStandardRoamingOnTheseFrames;

	public int ownerIterator;

	public static string[] tutorialRooms = new string[0];

	public bool safariOwner;

	public Player.InputPackage inputPackage;

	public bool InputCooldown;

	public int targetCreatureTime;

	public bool isPlayerGuide;

	private int SafariSwarmCap;

	public bool moonHelper;

	public int doorSelectionIndex;

	public int lastDoorSelectionIndex;

	public bool spearmasterLockedOverseer;

	private List<ShortcutData> validSafariDoors;

	public bool playerGuide => isPlayerGuide;

	private AbstractCreature RelevantPlayer
	{
		get
		{
			AbstractCreature abstractCreature = world.game.FirstAnyPlayer;
			if (ModManager.CoopAvailable && abstractCreature.state.dead)
			{
				abstractCreature = world.game.FirstAlivePlayer;
				if (abstractCreature == null)
				{
					abstractCreature = world.game.FirstAnyPlayer;
				}
			}
			return abstractCreature;
		}
	}

	public OverseerAbstractAI(World world, AbstractCreature parent)
		: base(world, parent)
	{
		lastRooms = new List<int> { parent.pos.room };
		playerGuideCounter = UnityEngine.Random.Range(200, 500);
		freezeStandardRoamingOnTheseFrames = 0;
		if (ModManager.MSC)
		{
			doorSelectionIndex = -1;
			moonHelper = false;
			inputPackage = RWInput.PlayerInput(0);
			InputCooldown = false;
		}
		if (world.overseersWorldAI == null)
		{
			world.AddWorldProcess(new OverseersWorldAI(world));
		}
		worldAI = world.overseersWorldAI;
		if (!world.singleRoomWorld)
		{
			if (world.region.name == "SS" || world.region.name == "RM" || world.region.name == "DM" || world.rainCycle.BlizzardWorldActive)
			{
				Custom.Log("Overseer abstractAI set seer to ignore cycle due to timerless region");
				base.parent.ignoreCycle = true;
			}
			if (ModManager.MSC && (world.region.name == "LM" || world.region.name == "DM" || world.region.name == "MS"))
			{
				ownerIterator = 1;
			}
			if (ModManager.MSC && (world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Spear || world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Artificer) && (world.region.name == "HI" || world.region.name == "SB" || world.region.name == "SH") && UnityEngine.Random.value < 0.2f)
			{
				ownerIterator = 1;
			}
			if (world.game.StoryCharacter == SlugcatStats.Name.Red && world.region.name != "UW" && UnityEngine.Random.value < ((world.region.name == "SL") ? 0.2f : 0.0125f))
			{
				ownerIterator = (ModManager.MSC ? 1 : 3);
			}
			if ((!ModManager.MSC || (world.game.StoryCharacter != MoreSlugcatsEnums.SlugcatStatsName.Rivulet && world.game.StoryCharacter != MoreSlugcatsEnums.SlugcatStatsName.Saint && world.game.StoryCharacter != MoreSlugcatsEnums.SlugcatStatsName.Spear)) && world.region.name == "SB")
			{
				ownerIterator = 2;
			}
			if (ModManager.MSC && world.region.name == "OE")
			{
				ownerIterator = 0;
				if (UnityEngine.Random.value < 0.1f)
				{
					ownerIterator = 1;
				}
				if (UnityEngine.Random.value < 0.01f)
				{
					ownerIterator = 2;
				}
				if (UnityEngine.Random.value < 0.0086f)
				{
					ownerIterator = 3;
					if (UnityEngine.Random.value < 0.1f)
					{
						ownerIterator = 5;
					}
					else if (UnityEngine.Random.value < 0.45f)
					{
						ownerIterator = 4;
					}
				}
			}
			if (ModManager.MSC && world.game.StoryCharacter != MoreSlugcatsEnums.SlugcatStatsName.Spear && world.region.name != "SL" && world.region.name != "MS" && UnityEngine.Random.value < 0.0001f)
			{
				ownerIterator = 3;
			}
		}
		SafariSwarmCap = 10;
	}

	public override void NewWorld(World newWorld)
	{
		base.NewWorld(newWorld);
		if (newWorld.overseersWorldAI == null)
		{
			newWorld.AddWorldProcess(new OverseersWorldAI(newWorld));
		}
		worldAI = newWorld.overseersWorldAI;
		if (playerGuide)
		{
			SetAsPlayerGuide((!ModManager.MSC) ? 1 : ownerIterator);
		}
	}

	public override void AbstractBehavior(int time)
	{
		if (world.singleRoomWorld && parent.pos.room == 0)
		{
			return;
		}
		if (targetCreature != null)
		{
			targetCreatureTime++;
		}
		if (ModManager.MSC && safariOwner)
		{
			WorldCoordinate newDest = new WorldCoordinate(-1, 0, 0, 0);
			inputPackage = RWInput.PlayerInput(0);
			if (parent.realizedCreature == null || (parent.realizedCreature != null && !parent.realizedCreature.inShortcut))
			{
				if (parent.Room.world.game.cameras[0].room.abstractRoom != parent.Room)
				{
					WorldCoordinate worldCoordinate = parent.world.game.cameras[0].room.ToWorldCoordinate(new IntVector2(0, 0));
					worldCoordinate.abstractNode = 0;
					newDest = worldCoordinate;
				}
				else
				{
					RainWorldGame game = parent.world.game;
					Overseer overseer = null;
					if (parent.realizedCreature != null)
					{
						overseer = parent.realizedCreature as Overseer;
					}
					if (!InputCooldown && !(parent.realizedCreature as Overseer).RevealMap)
					{
						if (targetCreature == null || (targetCreature != null && !targetCreature.controlled))
						{
							if (inputPackage.thrw)
							{
								if (targetCreature != parent)
								{
									ResetTargetCreature();
								}
								if (lastDoorSelectionIndex == -1)
								{
									doorSelectionIndex = validSafariDoors[0].destNode;
								}
								else
								{
									doorSelectionIndex = lastDoorSelectionIndex;
								}
								WorldCoordinate startCoord = parent.Room.realizedRoom.ShortcutLeadingToNode((parent.abstractAI as OverseerAbstractAI).doorSelectionIndex).startCoord;
								float num = float.MaxValue;
								if (inputPackage.AnyDirectionalInput)
								{
									Vector2 v = new Vector2(inputPackage.x, inputPackage.y);
									if (inputPackage.analogueDir.magnitude > 0.3f)
									{
										v = inputPackage.analogueDir;
									}
									WorldCoordinate worldCoordinate2 = startCoord;
									for (int i = 0; i < validSafariDoors.Count; i++)
									{
										int destNode = validSafariDoors[i].destNode;
										WorldCoordinate startCoord2 = parent.Room.realizedRoom.ShortcutLeadingToNode(destNode).startCoord;
										if (Vector2.Distance(startCoord2.Tile.ToVector2(), startCoord.Tile.ToVector2()) < num && Mathf.Abs(Mathf.DeltaAngle(Custom.VecToDeg(v), Custom.VecToDeg(Custom.DirVec(startCoord.Tile.ToVector2(), startCoord2.Tile.ToVector2())))) < 20f && startCoord2 != startCoord)
										{
											num = Vector2.Distance(startCoord2.Tile.ToVector2(), startCoord.Tile.ToVector2());
											worldCoordinate2 = startCoord2;
										}
										else if (Vector2.Distance(startCoord2.Tile.ToVector2(), startCoord.Tile.ToVector2()) < num && Mathf.Abs(Mathf.DeltaAngle(Custom.VecToDeg(v), Custom.VecToDeg(Custom.DirVec(startCoord.Tile.ToVector2(), startCoord2.Tile.ToVector2())))) < 45f && startCoord2 != startCoord)
										{
											num = Vector2.Distance(startCoord2.Tile.ToVector2(), startCoord.Tile.ToVector2());
											worldCoordinate2 = startCoord2;
										}
										else if (Vector2.Distance(startCoord2.Tile.ToVector2(), startCoord.Tile.ToVector2()) < num && Mathf.Abs(Mathf.DeltaAngle(Custom.VecToDeg(v), Custom.VecToDeg(Custom.DirVec(startCoord.Tile.ToVector2(), startCoord2.Tile.ToVector2())))) < 90f && startCoord2 != startCoord)
										{
											num = Vector2.Distance(startCoord2.Tile.ToVector2(), startCoord.Tile.ToVector2());
											worldCoordinate2 = startCoord2;
										}
									}
									doorSelectionIndex = parent.Room.realizedRoom.shortcutData(worldCoordinate2.Tile).destNode;
									lastDoorSelectionIndex = doorSelectionIndex;
									InputCooldown = true;
								}
							}
							else if (!inputPackage.thrw && doorSelectionIndex != -1)
							{
								int num2 = parent.Room.connections[parent.Room.realizedRoom.ShortcutLeadingToNode(doorSelectionIndex).destNode];
								if (num2 > -1)
								{
									IntVector2 size = parent.world.GetAbstractRoom(num2).size;
									newDest = new WorldCoordinate(num2, UnityEngine.Random.Range(0, size.x - 1), UnityEngine.Random.Range(0, size.y - 1), 0);
									if (parent.Room.realizedRoom != null)
									{
										Vector2 pos = parent.Room.realizedRoom.MiddleOfTile(parent.Room.realizedRoom.ShortcutLeadingToNode(doorSelectionIndex).startCoord);
										parent.Room.realizedRoom.PlaySound(SoundID.Overseer_Image_Big_Flicker, pos, parent);
										parent.Room.realizedRoom.AddObject(new Spark(pos, Custom.RNV() * (120f * UnityEngine.Random.value), Color.white, null, 20, 50));
										parent.Room.realizedRoom.AddObject(new ShockWave(pos, 200f, 0.1f, 7));
									}
									doorSelectionIndex = -1;
								}
								else
								{
									doorSelectionIndex = -1;
								}
							}
							else
							{
								doorSelectionIndex = -1;
							}
						}
						if (doorSelectionIndex == -1 && inputPackage.jmp && (targetCreature == null || !targetCreature.controlled))
						{
							ResetTargetCreature();
							if (overseer != null && overseer.room != null)
							{
								overseer.room.PlaySound(SoundID.Overseer_Image_Big_Flicker, overseer.mainBodyChunk);
								overseer.room.AddObject(new Spark(overseer.mainBodyChunk.pos, Custom.RNV() * (120f * UnityEngine.Random.value), Color.white, null, 20, 50));
								overseer.room.AddObject(new ShockWave(overseer.mainBodyChunk.pos, 200f, 0.1f, 7));
								InputCooldown = true;
							}
							AbstractRoom abstractRoom = null;
							int num3 = 50;
							while (abstractRoom == null || !RoomAllowed(abstractRoom.index) || (abstractRoom.creatures.Count == 0 && num3 > 0))
							{
								abstractRoom = parent.Room.world.GetAbstractRoom(UnityEngine.Random.Range(parent.Room.world.firstRoomIndex, parent.Room.world.firstRoomIndex + parent.Room.world.NumberOfRooms));
								num3--;
							}
							newDest = new WorldCoordinate(abstractRoom.index, -1, -1, 0);
						}
						else if (doorSelectionIndex == -1 && inputPackage.mp)
						{
							if (targetCreature != null && targetCreature != parent && targetCreature.realizedCreature != null && targetCreature.Room == parent.Room)
							{
								if (!targetCreature.controlled && targetCreature.realizedCreature is Scavenger)
								{
									(targetCreature.realizedCreature as Scavenger).lastSafariJoinedLookPoint = (targetCreature.realizedCreature as Scavenger).JoinedLookPoint;
								}
								targetCreature.controlled = !targetCreature.controlled;
								Creature realizedCreature = targetCreature.realizedCreature;
								if (targetCreature.controlled)
								{
									targetCreatureTime = 0;
									if (parent.realizedCreature != null && parent.realizedCreature.room != null)
									{
										parent.realizedCreature.room.PlaySound(SoundID.Moon_Wake_Up_Swarmer_Ping, 0f, 1f, 1f);
									}
									if (realizedCreature.room != null)
									{
										realizedCreature.room.AddObject(new Spark(realizedCreature.mainBodyChunk.pos, Custom.RNV() * (120f * UnityEngine.Random.value), Color.white, null, 20, 50));
										realizedCreature.room.AddObject(new ShockWave(realizedCreature.mainBodyChunk.pos, 200f, 0.1f, 7));
									}
								}
								else
								{
									targetCreatureTime = 0;
									if (parent.realizedCreature != null && parent.realizedCreature.room != null)
									{
										parent.realizedCreature.room.PlaySound(SoundID.HUD_Pause_Game, 0f, 1f, 0.5f);
									}
								}
								InputCooldown = true;
							}
						}
						else if (doorSelectionIndex == -1 && (inputPackage.x != 0 || inputPackage.y != 0) && (targetCreature == null || !targetCreature.controlled))
						{
							int x = inputPackage.x;
							int y = inputPackage.y;
							int num4 = -1;
							int num5 = 0;
							float num6 = float.MaxValue;
							Vector2 vector = new Vector2(-1f, -1f);
							if (targetCreature != null && game.cameras[0].room.abstractRoom == targetCreature.Room)
							{
								vector = targetCreature.pos.Tile.ToVector2() * 20f;
								if (targetCreature.realizedCreature != null)
								{
									vector = targetCreature.realizedCreature.mainBodyChunk.pos;
								}
								for (int j = 0; j < targetCreature.Room.creatures.Count; j++)
								{
									AbstractCreature abstractCreature = targetCreature.Room.creatures[j];
									if (targetCreature != null && targetCreature == abstractCreature)
									{
										num5 = j;
										break;
									}
								}
								for (int k = 0; k < targetCreature.Room.creatures.Count; k++)
								{
									if (!AllowedToTargetCreature(targetCreature.Room.creatures[k]))
									{
										continue;
									}
									Vector2 pos2 = targetCreature.Room.creatures[k].realizedCreature.mainBodyChunk.pos;
									float num7 = Vector2.Distance(pos2, vector);
									if (!(num7 < num6))
									{
										continue;
									}
									switch (x)
									{
									case -1:
										if (pos2.x < vector.x)
										{
											num4 = k;
											num6 = num7;
										}
										continue;
									case 1:
										if (pos2.x > vector.x)
										{
											num4 = k;
											num6 = num7;
										}
										continue;
									}
									switch (y)
									{
									case -1:
										if (pos2.y < vector.y)
										{
											num4 = k;
											num6 = num7;
										}
										break;
									case 1:
										if (pos2.y > vector.y)
										{
											num4 = k;
											num6 = num7;
										}
										break;
									}
								}
								if (num4 == -1)
								{
									num4 = num5;
								}
								if (num4 != -1)
								{
									bool num8 = targetCreature.Room.creatures[num4] != targetCreature;
									SetTargetCreature(targetCreature.Room.creatures[num4]);
									if (num8)
									{
										OnSafariTargetChanged();
									}
									InputCooldown = true;
								}
							}
						}
					}
					else if (inputPackage.x == 0 && inputPackage.y == 0 && !inputPackage.jmp && !inputPackage.mp)
					{
						InputCooldown = false;
					}
					if (inputPackage.thrw && doorSelectionIndex != -1 && parent.realizedCreature != null && (parent.realizedCreature as Overseer).rootTile != parent.Room.realizedRoom.ShortcutLeadingToNode(doorSelectionIndex).startCoord.Tile)
					{
						parent.pos = parent.Room.realizedRoom.ShortcutLeadingToNode(doorSelectionIndex).startCoord;
						(parent.realizedCreature as Overseer).HardSetTile(parent.Room.realizedRoom.ShortcutLeadingToNode(doorSelectionIndex).startCoord.Tile + parent.Room.realizedRoom.ShorcutEntranceHoleDirection((parent.realizedCreature as Overseer).hoverTile), parent.Room.realizedRoom.ShortcutLeadingToNode(doorSelectionIndex).startCoord.Tile);
					}
				}
			}
			if (targetCreature != null && world.game.cameras[0].followAbstractCreature != targetCreature)
			{
				world.game.cameras[0].followAbstractCreature = targetCreature;
			}
			if (world.game.cameras[0].followAbstractCreature != parent)
			{
				if (!RoomAllowed(world.game.cameras[0].followAbstractCreature.Room.index))
				{
					ResetTargetCreature();
				}
				else
				{
					newDest = world.game.cameras[0].followAbstractCreature.pos;
				}
			}
			if (targetCreature != null && targetCreature.state.dead)
			{
				bool flag = false;
				if (targetCreature.realizedCreature != null && targetCreature.realizedCreature.killTag != null && AllowedToTargetCreature(targetCreature.realizedCreature.killTag))
				{
					SetTargetCreature(targetCreature.realizedCreature.killTag);
					OnSafariTargetChanged();
					flag = true;
				}
				else
				{
					for (int l = 0; l < parent.Room.creatures.Count; l++)
					{
						if (AllowedToTargetCreature(parent.Room.creatures[l]))
						{
							SetTargetCreature(parent.Room.creatures[l]);
							OnSafariTargetChanged();
							flag = true;
							break;
						}
					}
				}
				if (!flag)
				{
					ResetTargetCreature();
				}
			}
			if ((parent.Room.index == world.offScreenDen.index || parent.Room.index == parent.world.game.cameras[0].room.abstractRoom.index) && newDest.room != -1 && !world.DisabledMapRooms.Contains(world.GetAbstractRoom(newDest.room).name))
			{
				SetDestinationNoPathing(newDest, migrate: true);
			}
		}
		if (playerGuide)
		{
			PlayerGuideUpdate(time);
		}
		if (ModManager.MSC && moonHelper && parent.Room.world.game.IsMoonActive())
		{
			if (UnityEngine.Random.value < 0.08f)
			{
				if (world.region.name == "SL" && parent.Room.index != parent.Room.world.GetAbstractRoom("SL_AI").index)
				{
					ResetTargetCreature();
					GoToRandomDestinationInMoonChamber(allowForceJump: false);
				}
				else if (world.region.name == "RM" && parent.Room.index != parent.Room.world.GetAbstractRoom("RM_AI").index)
				{
					ResetTargetCreature();
					GoToRandomDestinationInRMChamber(allowForceJump: false);
				}
			}
			if (parent.realizedCreature != null && parent.Room.name == "SL_AI" && !Custom.InsideRect((int)parent.realizedCreature.mainBodyChunk.pos.x, (int)parent.realizedCreature.mainBodyChunk.pos.y, new IntRect(1180, 100, 1940, 690)))
			{
				ResetTargetCreature();
				GoToRandomDestinationInMoonChamber(allowForceJump: true);
			}
			if (parent.realizedCreature != null && parent.Room.name == "RM_AI" && !Custom.InsideRect((int)parent.realizedCreature.mainBodyChunk.pos.x, (int)parent.realizedCreature.mainBodyChunk.pos.y, new IntRect(1160, 750, 1880, 1430)))
			{
				ResetTargetCreature();
				GoToRandomDestinationInRMChamber(allowForceJump: true);
			}
		}
		if (world.game.Players.Count > 0 && RelevantPlayer != null && (goToPlayer || (ModManager.MMF && playerGuide && playerGuideCounter > 0 && parent.Room.index != RelevantPlayer.Room.index)))
		{
			if (ModManager.MMF)
			{
				SetTargetCreature(RelevantPlayer);
			}
			else
			{
				targetCreature = RelevantPlayer;
			}
		}
		else if (!ModManager.MSC || !safariOwner)
		{
			if (playerGuide && targetCreature != null && targetCreature.creatureTemplate.type == CreatureTemplate.Type.Slugcat)
			{
				if (base.destination.room == targetCreature.pos.room)
				{
					Roam(time, 1f);
				}
				lastTargetCreature = targetCreature;
				if (ModManager.MMF)
				{
					ResetTargetCreature();
				}
				else
				{
					targetCreature = null;
				}
			}
			if (parent.Room.creatures.Count > 1 && TimeInfluencedRandomRoll(0.2f, time))
			{
				AbstractCreature abstractCreature2 = parent.Room.creatures[UnityEngine.Random.Range(0, parent.Room.creatures.Count)];
				if (abstractCreature2 != null && abstractCreature2.creatureTemplate.type != CreatureTemplate.Type.Overseer && (abstractCreature2.creatureTemplate.type != CreatureTemplate.Type.Slugcat || !playerGuide) && abstractCreature2 != lastTargetCreature && HowInterestingIsCreature(abstractCreature2) > HowInterestingIsCreature(targetCreature))
				{
					if (ModManager.MMF)
					{
						SetTargetCreature(abstractCreature2);
					}
					else
					{
						targetCreature = abstractCreature2;
					}
					targetCreatureCounter = (int)(Mathf.Lerp(100f, 2000f, UnityEngine.Random.value) * HowInterestingIsCreature(abstractCreature2));
				}
			}
			if (targetCreature != null || HowInterestingIsCreature(targetCreature) <= 0f)
			{
				targetCreatureCounter -= time;
				if (targetCreatureCounter < 1)
				{
					lastTargetCreature = targetCreature;
					if (ModManager.MMF)
					{
						ResetTargetCreature();
					}
					else
					{
						targetCreature = null;
					}
				}
			}
		}
		if (parent.pos.room != lastRoom.room)
		{
			lastRooms.Insert(0, parent.pos.room);
			if (lastRooms.Count > 10)
			{
				lastRooms.RemoveAt(lastRooms.Count - 1);
			}
			lastRoom = parent.pos;
		}
		if (!ModManager.MSC || !safariOwner)
		{
			if (freezeStandardRoamingOnTheseFrames <= 0)
			{
				if (world.rainCycle.TimeUntilRain < 4800 && !parent.ignoreCycle && (!playerGuide || RealAI == null || (RealAI as OverseerAI).tutorialBehavior == null))
				{
					if (TimeInfluencedRandomRoll(1f / 120f, time))
					{
						SetDestinationNoPathing(new WorldCoordinate(world.offScreenDen.index, -1, -1, 0), migrate: true);
					}
				}
				else if (ModManager.MSC && moonHelper)
				{
					Roam(time, 1f / Mathf.Lerp(1600f, 3000f, world.GetAbstractRoom(parent.pos).AttractionValueForCreature(parent)));
				}
				else if (targetCreature != null && RoomAllowed(targetCreature.Room.index))
				{
					SetDestinationNoPathing(targetCreature.pos, migrate: true);
				}
				else
				{
					bool flag2 = false;
					for (int m = 0; m < tutorialRooms.Length; m++)
					{
						if (parent.Room.name == tutorialRooms[m])
						{
							flag2 = true;
							break;
						}
					}
					if (ModManager.MMF && flag2 && playerGuideCounter > 0)
					{
						Roam(time, 1f / Mathf.Lerp(2100f, 19000f, world.GetAbstractRoom(parent.pos).AttractionValueForCreature(parent)));
					}
					else
					{
						Roam(time, 1f / Mathf.Lerp(20f, 2000f, world.GetAbstractRoom(parent.pos).AttractionValueForCreature(parent)));
					}
				}
			}
		}
		else if (targetCreature != null && targetCreature.Room != parent.Room && RoomAllowed(targetCreature.Room.index))
		{
			SetDestinationNoPathing(targetCreature.pos, migrate: true);
			if (parent.realizedCreature != null && parent.realizedCreature.room != null)
			{
				parent.realizedCreature.room.game.shortcuts.CreatureTeleportOutOfRoom(parent.realizedCreature, parent.pos, targetCreature.pos);
			}
		}
		else if (targetCreature != null && targetCreature.Room == parent.Room && targetCreature.realizedCreature != null && parent.realizedCreature != null && Vector2.Distance(targetCreature.realizedCreature.firstChunk.pos, parent.realizedCreature.firstChunk.pos) > 300f)
		{
			SetDestinationNoPathing(targetCreature.pos, migrate: true);
		}
		if (base.destination.room != parent.pos.room && (TimeInfluencedRandomRoll(1f / Mathf.Lerp(200f, 10f, Mathf.Pow(world.GetAbstractRoom(base.destination).AttractionValueForCreature(parent), 0.4f)), time) || (ModManager.MSC && safariOwner)))
		{
			if (parent.realizedCreature == null)
			{
				parent.Move(parent.abstractAI.destination);
			}
			else
			{
				if (ModManager.MSC && safariOwner && (parent.realizedCreature as Overseer).mode != Overseer.Mode.Withdrawing && (parent.realizedCreature as Overseer).mode != Overseer.Mode.Zipping)
				{
					(parent.realizedCreature as Overseer).SwitchModes(Overseer.Mode.Watching);
				}
				if ((parent.realizedCreature as Overseer).mode == Overseer.Mode.Watching || (parent.realizedCreature as Overseer).mode == Overseer.Mode.Projecting)
				{
					(parent.realizedCreature as Overseer).ZipOutOfRoom(parent.abstractAI.destination);
				}
			}
		}
		freezeStandardRoamingOnTheseFrames--;
	}

	private void GoToRandomDestinationInMoonChamber(bool allowForceJump)
	{
		float value = UnityEngine.Random.value;
		WorldCoordinate worldCoordinate = default(WorldCoordinate);
		worldCoordinate = ((value <= 0.33f) ? new WorldCoordinate(parent.Room.world.GetAbstractRoom("SL_AI").index, UnityEngine.Random.Range(57, 62), UnityEngine.Random.Range(9, 32), -1) : ((!(value <= 0.67f)) ? new WorldCoordinate(parent.Room.world.GetAbstractRoom("SL_AI").index, UnityEngine.Random.Range(57, 93), UnityEngine.Random.Range(28, 32), -1) : new WorldCoordinate(parent.Room.world.GetAbstractRoom("SL_AI").index, UnityEngine.Random.Range(87, 93), UnityEngine.Random.Range(9, 32), -1)));
		SetDestinationNoPathing(worldCoordinate, migrate: true);
		if (parent.realizedCreature != null && allowForceJump)
		{
			(parent.realizedCreature as Overseer).ZipToPosition(new Vector2((float)worldCoordinate.x * 20f, (float)worldCoordinate.y * 20f));
		}
		freezeStandardRoamingOnTheseFrames = 10;
	}

	private void GoToRandomDestinationInRMChamber(bool allowForceJump)
	{
		float value = UnityEngine.Random.value;
		WorldCoordinate worldCoordinate = default(WorldCoordinate);
		worldCoordinate = ((value <= 0.33f) ? new WorldCoordinate(parent.Room.world.GetAbstractRoom("RM_AI").index, UnityEngine.Random.Range(57, 62), UnityEngine.Random.Range(37, 71), -1) : ((!(value <= 0.67f)) ? new WorldCoordinate(parent.Room.world.GetAbstractRoom("RM_AI").index, UnityEngine.Random.Range(57, 93), UnityEngine.Random.Range(67, 71), -1) : new WorldCoordinate(parent.Room.world.GetAbstractRoom("RM_AI").index, UnityEngine.Random.Range(87, 93), UnityEngine.Random.Range(37, 71), -1)));
		SetDestinationNoPathing(worldCoordinate, migrate: true);
		if (parent.realizedCreature != null && allowForceJump)
		{
			(parent.realizedCreature as Overseer).ZipToPosition(new Vector2((float)worldCoordinate.x * 20f, (float)worldCoordinate.y * 20f));
		}
		freezeStandardRoamingOnTheseFrames = 10;
	}

	private void Roam(int time, float chance)
	{
		if (base.destination.room != parent.pos.room || !TimeInfluencedRandomRoll(chance, time))
		{
			return;
		}
		if (parent.pos.room == world.offScreenDen.index)
		{
			float num = float.MinValue;
			int num2 = -1;
			for (int i = 0; i < 20; i++)
			{
				int num3 = UnityEngine.Random.Range(world.firstRoomIndex, world.firstRoomIndex + world.NumberOfRooms);
				if (!RoomAllowed(num3))
				{
					continue;
				}
				float num4 = world.GetAbstractRoom(num3).SizeDependentAttractionValueForCreature(parent) * Mathf.Lerp(0.9f, 1.1f, UnityEngine.Random.value);
				if (world.GetAbstractRoom(num3).AttractionForCreature(parent) == AbstractRoom.CreatureRoomAttraction.Avoid)
				{
					num4 *= 0.1f;
				}
				for (int j = 0; j < world.GetAbstractRoom(num3).creatures.Count; j++)
				{
					if (world.GetAbstractRoom(num3).creatures[j].creatureTemplate.type == CreatureTemplate.Type.Overseer)
					{
						num4 *= 0.5f;
					}
				}
				if (num4 > num)
				{
					num = num4;
					num2 = num3;
				}
			}
			if (num2 > -1)
			{
				Custom.Log("overseer travelling to : ", world.GetAbstractRoom(num2).name);
				SetDestinationNoPathing(new WorldCoordinate(num2, -1, -1, 1), migrate: true);
			}
			return;
		}
		float num5 = float.MinValue;
		int num6 = -1;
		for (int k = 0; k < world.GetAbstractRoom(parent.pos).connections.Length; k++)
		{
			if (world.GetAbstractRoom(parent.pos).connections[k] <= -1 || !RoomAllowed(world.GetAbstractRoom(parent.pos).connections[k]))
			{
				continue;
			}
			float value = UnityEngine.Random.value;
			float num7 = 0f;
			for (int l = 0; l < world.GetAbstractRoom(parent.pos).creatures.Count; l++)
			{
				num7 = Mathf.Max(num7, HowInterestingIsCreature(world.GetAbstractRoom(parent.pos).creatures[l]));
			}
			value += num7 * UnityEngine.Random.value;
			value *= world.GetAbstractRoom(parent.pos).AttractionValueForCreature(parent);
			value += 20f * world.GetAbstractRoom(parent.pos).AttractionValueForCreature(parent);
			for (int m = 0; m < lastRooms.Count; m++)
			{
				if (lastRooms[m] == world.GetAbstractRoom(parent.pos).connections[k])
				{
					value -= (20f - (float)m) * UnityEngine.Random.value;
					break;
				}
			}
			if (value > num5)
			{
				num6 = world.GetAbstractRoom(parent.pos).connections[k];
				num5 = value;
			}
		}
		if (num6 > -1)
		{
			SetDestinationNoPathing(new WorldCoordinate(num6, -1, -1, 0), migrate: true);
		}
	}

	public bool RoomAllowed(int room)
	{
		if (room < world.firstRoomIndex || room >= world.firstRoomIndex + world.NumberOfRooms)
		{
			return false;
		}
		if (ModManager.MSC && moonHelper)
		{
			if (!world.GetAbstractRoom(room).gate)
			{
				return !world.GetAbstractRoom(room).shelter;
			}
			return false;
		}
		if (ModManager.MSC && safariOwner)
		{
			foreach (string disabledMapRoom in world.DisabledMapRooms)
			{
				if (disabledMapRoom == world.GetAbstractRoom(room).name)
				{
					return false;
				}
			}
			return !world.GetAbstractRoom(room).offScreenDen;
		}
		if (ModManager.MMF && playerGuide)
		{
			for (int i = 0; i < tutorialRooms.Length; i++)
			{
				if (world.GetAbstractRoom(room).name == tutorialRooms[i])
				{
					return true;
				}
			}
		}
		if (world.GetAbstractRoom(room).AttractionForCreature(parent) == AbstractRoom.CreatureRoomAttraction.Forbidden && (!playerGuide || !world.GetAbstractRoom(room).gate))
		{
			return false;
		}
		if (world.GetAbstractRoom(room).scavengerOutpost || world.GetAbstractRoom(room).scavengerTrader)
		{
			return false;
		}
		return true;
	}

	public float HowInterestingIsCreature(AbstractCreature testCrit)
	{
		if (ModManager.MSC && safariOwner)
		{
			if (testCrit == null)
			{
				return 0f;
			}
			if (testCrit == targetCreature)
			{
				return 1f;
			}
			return 0f;
		}
		if (testCrit == null || testCrit.creatureTemplate.smallCreature)
		{
			return 0f;
		}
		float num = 0f;
		if (!(testCrit.creatureTemplate.type == CreatureTemplate.Type.Slugcat))
		{
			num = ((!(testCrit.creatureTemplate.type == CreatureTemplate.Type.PinkLizard) && !(testCrit.creatureTemplate.type == CreatureTemplate.Type.YellowLizard) && !(testCrit.creatureTemplate.type == CreatureTemplate.Type.BlackLizard) && !(testCrit.creatureTemplate.type == CreatureTemplate.Type.BlueLizard) && !(testCrit.creatureTemplate.type == CreatureTemplate.Type.Salamander)) ? ((testCrit.creatureTemplate.type == CreatureTemplate.Type.GreenLizard) ? 0.2f : ((testCrit.creatureTemplate.type == CreatureTemplate.Type.WhiteLizard) ? 0.6f : ((testCrit.creatureTemplate.type == CreatureTemplate.Type.RedLizard) ? 0.65f : ((testCrit.creatureTemplate.type == CreatureTemplate.Type.Overseer) ? 1f : ((!(testCrit.creatureTemplate.type == CreatureTemplate.Type.Vulture) && !(testCrit.creatureTemplate.type == CreatureTemplate.Type.KingVulture) && !(testCrit.creatureTemplate.type == CreatureTemplate.Type.LanternMouse)) ? ((testCrit.creatureTemplate.type == CreatureTemplate.Type.Scavenger) ? 1f : ((testCrit.creatureTemplate.type == CreatureTemplate.Type.GarbageWorm) ? 0.65f : ((!(testCrit.creatureTemplate.type == CreatureTemplate.Type.CicadaA) && !(testCrit.creatureTemplate.type == CreatureTemplate.Type.CicadaB)) ? ((testCrit.creatureTemplate.type == CreatureTemplate.Type.DaddyLongLegs || testCrit.creatureTemplate.type == CreatureTemplate.Type.BrotherLongLegs) ? 0.2f : ((!(testCrit.creatureTemplate.type == CreatureTemplate.Type.BigEel)) ? 0.1f : 0.55f)) : 0.15f))) : 0.25f))))) : 0.5f);
		}
		else
		{
			num = ((testCrit.realizedCreature == null) ? 0.15f : Custom.LerpMap((testCrit.realizedCreature as Player).Karma, 0f, 4f, 0.15f, 2f, 1.2f));
			if (playerGuide)
			{
				num = Mathf.Max(1.5f, num);
			}
			if (ModManager.MMF && goToPlayer)
			{
				num = 1.5f;
			}
		}
		if (testCrit.state.dead)
		{
			num /= 10f;
		}
		num *= testCrit.Room.AttractionValueForCreature(parent);
		return num * Mathf.Lerp(0.5f, 1.5f, world.game.SeededRandom(parent.ID.RandomSeed + testCrit.ID.RandomSeed));
	}

	public override void Moved()
	{
		base.Moved();
		if (playerGuide && parent.pos.room == world.offScreenDen.index && (world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.angryWithPlayer)
		{
			Custom.Log("remove guide");
			parent.Destroy();
		}
	}

	public void BringToRoomAndGuidePlayer(int room)
	{
		if (playerGuide)
		{
			playerGuideCounter = 500;
			goToPlayer = true;
			if (room > -1 && parent.pos.room != room)
			{
				SetDestinationNoPathing(new WorldCoordinate(room, -1, -1, 0), migrate: true);
			}
		}
	}

	public void PlayerGuideGoAway(int time)
	{
		goToPlayer = false;
		playerGuideCounter = Math.Max(playerGuideCounter, time);
	}

	private void PlayerGuideUpdate(int time)
	{
		if (world.game.Players.Count == 0)
		{
			return;
		}
		if (ModManager.MSC && world.game.IsStorySession && world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Spear && world.game.GetStorySession.saveState.miscWorldSaveData.SSaiConversationsHad > 0)
		{
			PlayerGuideGoAway(40);
			parent.Die();
			return;
		}
		if (ModManager.MSC && world.game.IsStorySession && world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Spear && !spearmasterLockedOverseer && RelevantPlayer != null && RelevantPlayer.Room.name == "SS_AI")
		{
			PlayerGuideGoAway(40);
			parent.Die();
			return;
		}
		playerGuideCounter -= time;
		if (playerGuideCounter < 1)
		{
			goToPlayer = !goToPlayer;
			float num = Mathf.InverseLerp(-0.5f, 1f, (world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.likesPlayer);
			if (num <= 0.01f)
			{
				goToPlayer = false;
			}
			if (goToPlayer && RelevantPlayer != null)
			{
				for (int i = 0; i < RelevantPlayer.Room.creatures.Count; i++)
				{
					if (RelevantPlayer.Room.creatures[i].creatureTemplate.type == CreatureTemplate.Type.Scavenger && RelevantPlayer.Room.creatures[i].state.alive)
					{
						goToPlayer = false;
						Custom.Log("Player guide not coming because scavengers in room");
						break;
					}
				}
			}
			num = Mathf.Pow(num, 0.15f) * Mathf.Lerp(0.5f, 1f, (world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.handHolding);
			if (goToPlayer)
			{
				playerGuideCounter += (int)Mathf.Lerp(200f, Mathf.Lerp(400f, 1200f, num), UnityEngine.Random.value);
			}
			else
			{
				playerGuideCounter += (int)Mathf.Lerp(800f, Mathf.Lerp(4400f, 2200f, num), UnityEngine.Random.value);
			}
			Custom.Log(num.ToString(), goToPlayer ? "go to" : "go away", playerGuideCounter.ToString());
		}
		if (goToPlayer || RealAI == null || (RealAI as OverseerAI).tutorialBehavior == null)
		{
			return;
		}
		DefineTutorialRooms();
		for (int j = 0; j < tutorialRooms.Length; j++)
		{
			if (RelevantPlayer == null)
			{
				break;
			}
			if (RelevantPlayer.Room.name == tutorialRooms[j])
			{
				goToPlayer = true;
				playerGuideCounter = 1000;
			}
		}
	}

	public static void DefineTutorialRooms()
	{
		bool flag = ModManager.MMF && MMF.cfgExtraTutorials.Value;
		if (flag && tutorialRooms.Length != 8)
		{
			tutorialRooms = new string[8] { "SU_C04", "SU_A41", "SU_A42", "SU_A43", "SU_A44", "SU_A22", "GATE_SU_DS", "GATE_SU_HI" };
		}
		else if (!flag && tutorialRooms.Length != 6)
		{
			tutorialRooms = new string[6] { "SU_C04", "SU_A41", "SU_A42", "SU_A43", "SU_A44", "SU_A22" };
		}
	}

	public void SetAsPlayerGuide(int ownerOverride)
	{
		isPlayerGuide = true;
		ownerIterator = ownerOverride;
		if (worldAI == null)
		{
			if (world.overseersWorldAI == null)
			{
				world.AddWorldProcess(new OverseersWorldAI(world));
			}
			worldAI = world.overseersWorldAI;
		}
		worldAI.playerGuide = parent;
		worldAI.guidePlayerToNextRegion = true;
	}

	public void SetTargetCreature(AbstractCreature newTarget)
	{
		ResetTargetCreature();
		targetCreature = newTarget;
		targetCreatureTime = 0;
	}

	public bool AllowedToTargetCreature(AbstractCreature evalTarget, AbstractRoom roomCheck)
	{
		if (evalTarget != null && (!safariOwner || evalTarget.creatureTemplate.type != CreatureTemplate.Type.Overseer) && evalTarget.realizedCreature != null && !evalTarget.realizedCreature.dead && evalTarget.creatureTemplate.type != CreatureTemplate.Type.Spider && (safariOwner || evalTarget.creatureTemplate.type != CreatureTemplate.Type.TubeWorm) && evalTarget.creatureTemplate.type != WatcherEnums.CreatureTemplateType.BoxWorm && !evalTarget.InDen && evalTarget != parent && !evalTarget.slatedForDeletion && evalTarget.Room == roomCheck && RoomAllowed(evalTarget.Room.index) && evalTarget != targetCreature && AllowSwarmTarget(evalTarget, roomCheck))
		{
			SafariSwarmCap = 10;
			return true;
		}
		return false;
	}

	public bool AllowSwarmTarget(AbstractCreature evalTarget, AbstractRoom roomCheck)
	{
		if ((targetCreature.creatureTemplate.type == CreatureTemplate.Type.Leech || targetCreature.creatureTemplate.type == CreatureTemplate.Type.Fly || targetCreature.creatureTemplate.type == CreatureTemplate.Type.SeaLeech || targetCreature.creatureTemplate.type == DLCSharedEnums.CreatureTemplateType.JungleLeech || targetCreature.creatureTemplate.type == CreatureTemplate.Type.Spider) && SafariSwarmCap > 0)
		{
			SafariSwarmCap--;
			if (Custom.Dist(targetCreature.pos.Tile.ToVector2(), evalTarget.pos.Tile.ToVector2()) > 6f)
			{
				return true;
			}
			if (targetCreature.creatureTemplate.type == evalTarget.creatureTemplate.type)
			{
				return false;
			}
		}
		return true;
	}

	public bool AllowedToTargetCreature(AbstractCreature evalTarget)
	{
		return AllowedToTargetCreature(evalTarget, parent.Room);
	}

	public void OnSafariTargetChanged()
	{
		SetDestinationNoPathing(targetCreature.pos, migrate: true);
		targetCreatureCounter = 999999;
		world.game.cameras[0].followAbstractCreature = targetCreature;
		if (parent.realizedCreature != null && parent.realizedCreature.room != null)
		{
			parent.realizedCreature.room.PlaySound(SoundID.MENU_Button_Select_Mouse, 0f, 1f, UnityEngine.Random.value * 0.75f + 0.75f);
		}
	}

	public void ResetTargetCreature()
	{
		if (ModManager.MSC && safariOwner)
		{
			if (targetCreature != null)
			{
				if (targetCreature.controlled && parent.realizedCreature != null && parent.realizedCreature.room != null)
				{
					parent.realizedCreature.room.PlaySound(SoundID.HUD_Pause_Game, 0f, 1f, 0.5f);
				}
				targetCreature.controlled = false;
			}
			world.game.cameras[0].followAbstractCreature = parent;
			targetCreature = parent;
		}
		else
		{
			targetCreature = null;
		}
		targetCreatureTime = 0;
	}

	public void NewRoom(Room newRoom)
	{
		lastDoorSelectionIndex = -1;
		doorSelectionIndex = -1;
		validSafariDoors = new List<ShortcutData>();
		ShortcutData[] shortcuts = newRoom.shortcuts;
		for (int i = 0; i < shortcuts.Length; i++)
		{
			ShortcutData item = shortcuts[i];
			if (item.LeadingSomewhere && item.destNode > -1 && item.destNode < newRoom.abstractRoom.connections.Length && newRoom.abstractRoom.connections[item.destNode] > -1)
			{
				validSafariDoors.Add(item);
			}
		}
		if (!safariOwner || (targetCreature != null && targetCreature != parent && targetCreature.Room == newRoom.abstractRoom))
		{
			return;
		}
		ResetTargetCreature();
		for (int j = 0; j < newRoom.abstractRoom.creatures.Count; j++)
		{
			if (AllowedToTargetCreature(newRoom.abstractRoom.creatures[j], newRoom.abstractRoom))
			{
				SetTargetCreature(newRoom.abstractRoom.creatures[j]);
				break;
			}
		}
	}
}
