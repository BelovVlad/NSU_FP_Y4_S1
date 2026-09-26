using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using MoreSlugcats;
using RWCustom;

public class OverseersWorldAI : World.WorldProcess
{
	public class ShelterFinder
	{
		private World world;

		public float[,][] matrix;

		public int currentlyMappingShelter = -1;

		public List<IntVector2> checkNext;

		public bool done;

		public ShelterFinder(World world)
		{
			this.world = world;
			checkNext = new List<IntVector2>();
			matrix = new float[world.shelters.Length, world.NumberOfRooms][];
			for (int i = 0; i < matrix.GetLength(0); i++)
			{
				for (int j = 0; j < matrix.GetLength(1); j++)
				{
					matrix[i, j] = new float[world.GetAbstractRoom(j + world.firstRoomIndex).connections.Length];
					for (int k = 0; k < matrix[i, j].Length; k++)
					{
						matrix[i, j][k] = -1f;
					}
				}
			}
		}

		public void Update()
		{
			if (done)
			{
				return;
			}
			if (checkNext.Count < 1)
			{
				NextShelter();
				return;
			}
			float num = float.MaxValue;
			int num2 = -1;
			for (int i = 0; i < checkNext.Count; i++)
			{
				float num3 = ResistanceOfCell(checkNext[i]);
				if (num3 > -1f && num3 < num)
				{
					num = num3;
					num2 = i;
				}
			}
			if (num2 < 0)
			{
				NextShelter();
				return;
			}
			IntVector2 testCell = checkNext[num2];
			checkNext.RemoveAt(num2);
			AbstractRoom abstractRoom = world.GetAbstractRoom(testCell.x + world.firstRoomIndex);
			float num4 = ResistanceOfCell(testCell);
			for (int j = 0; j < abstractRoom.connections.Length; j++)
			{
				float num5 = -1f;
				WorldCoordinate worldCoordinate;
				if (j == testCell.y && abstractRoom.connections[j] > -1)
				{
					worldCoordinate = new WorldCoordinate(abstractRoom.connections[j], -1, -1, world.GetAbstractRoom(abstractRoom.connections[j]).ExitIndex(abstractRoom.index));
					num5 = world.TotalShortCutLengthBetweenTwoConnectedRooms(abstractRoom.index, abstractRoom.connections[j]);
				}
				else
				{
					if (j >= abstractRoom.nodes.Length)
					{
						worldCoordinate = new WorldCoordinate(abstractRoom.index, -1, -1, -1);
						num5 = -1f;
					}
					else
					{
						worldCoordinate = new WorldCoordinate(abstractRoom.index, -1, -1, j);
						num5 = abstractRoom.nodes[j].ConnectionLength(testCell.y, StaticWorld.GetCreatureTemplate(CreatureTemplate.Type.Fly));
					}
					if (num5 == -1f)
					{
						num5 = 10000f;
					}
				}
				if (num5 > -1f && worldCoordinate.abstractNode >= 0 && matrix[currentlyMappingShelter, worldCoordinate.room - world.firstRoomIndex][worldCoordinate.abstractNode] == -1f)
				{
					matrix[currentlyMappingShelter, worldCoordinate.room - world.firstRoomIndex][worldCoordinate.abstractNode] = num4 + num5;
					checkNext.Add(new IntVector2(worldCoordinate.room - world.firstRoomIndex, worldCoordinate.abstractNode));
				}
			}
		}

		private float ResistanceOfCell(IntVector2 testCell)
		{
			if (testCell.x < 0 || testCell.x > world.NumberOfRooms)
			{
				return -1f;
			}
			if (testCell.y < 0 || testCell.y >= matrix[currentlyMappingShelter, testCell.x].Length)
			{
				return -1f;
			}
			return matrix[currentlyMappingShelter, testCell.x][testCell.y];
		}

		private void NextShelter()
		{
			currentlyMappingShelter++;
			Custom.Log("Mapping shelter:", currentlyMappingShelter.ToString());
			checkNext.Clear();
			if (currentlyMappingShelter >= matrix.GetLength(0))
			{
				done = true;
			}
			else if (world.brokenShelters[currentlyMappingShelter])
			{
				Custom.Log("shelter", currentlyMappingShelter.ToString(), "broken, not mapping");
				NextShelter();
			}
			else
			{
				AbstractRoom abstractRoom = world.GetAbstractRoom(world.shelters[currentlyMappingShelter]);
				checkNext.Add(new IntVector2(abstractRoom.index - world.firstRoomIndex, 0));
				matrix[currentlyMappingShelter, abstractRoom.index - world.firstRoomIndex][0] = 0f;
			}
		}

		public float DistanceToShelter(int shelter, WorldCoordinate testPos)
		{
			if (testPos.room - world.firstRoomIndex < 0 || testPos.room - world.firstRoomIndex > world.NumberOfRooms)
			{
				return -1f;
			}
			return matrix[shelter, testPos.room - world.firstRoomIndex][testPos.abstractNode];
		}
	}

	public class DirectionFinder
	{
		private World world;

		public float[][] matrix;

		public List<IntVector2> checkNext;

		public bool done;

		public int showToRoom = -1;

		public int minKarma;

		public bool destroy;

		private bool showGateSymbol;

		public bool DestinationRoomVisisted => (world.game.session as StoryGameSession).saveState.regionStates[world.region.regionNumber].roomsVisited.Contains(world.GetAbstractRoom(showToRoom).name);

		public DirectionFinder(World world)
		{
			this.world = world;
			checkNext = new List<IntVector2>();
			matrix = new float[world.NumberOfRooms][];
			for (int i = 0; i < matrix.Length; i++)
			{
				matrix[i] = new float[world.GetAbstractRoom(i + world.firstRoomIndex).connections.Length];
				for (int j = 0; j < matrix[i].Length; j++)
				{
					matrix[i][j] = -1f;
				}
			}
			string text = "";
			if (ModManager.MSC)
			{
				text = getOverseerStoryGoalRoom(world.region.name);
			}
			else
			{
				bool everMetMoon = (world.game.session as StoryGameSession).saveState.miscWorldSaveData.EverMetMoon;
				bool flag = true;
				switch (world.region.name)
				{
				case "SU":
					if (everMetMoon)
					{
						destroy = true;
					}
					else
					{
						text = "GATE_SU_HI";
					}
					break;
				case "HI":
					text = ((!everMetMoon) ? "GATE_HI_GW" : "GATE_HI_SH");
					break;
				case "GW":
					if (everMetMoon)
					{
						destroy = true;
					}
					else
					{
						text = "GATE_GW_SL";
					}
					break;
				case "SH":
					text = ((!everMetMoon) ? "GATE_SH_SL" : "GATE_SH_UW");
					break;
				case "SL":
					if (everMetMoon)
					{
						text = "GATE_SH_SL";
						break;
					}
					text = "SL_AI";
					flag = false;
					break;
				default:
					destroy = true;
					break;
				}
				showGateSymbol = flag;
			}
			if (destroy)
			{
				return;
			}
			if (world.GetAbstractRoom(text) != null)
			{
				showToRoom = world.GetAbstractRoom(text).index;
			}
			if (showGateSymbol)
			{
				string[] array = File.ReadAllLines(AssetManager.ResolveFilePath("World" + Path.DirectorySeparatorChar + "Gates" + Path.DirectorySeparatorChar + "locks.txt"));
				for (int k = 0; k < array.Length; k++)
				{
					if (!(text == Regex.Split(array[k], " : ")[0]))
					{
						continue;
					}
					string[] array2 = Regex.Split(Regex.Split(array[k], " : ")[0], "_");
					int num = -1;
					for (int l = 1; l < array2.Length; l++)
					{
						if (array2[l] == world.region.name)
						{
							num = l;
							break;
						}
					}
					if (num > 0)
					{
						minKarma = int.Parse(Regex.Split(array[k], " : ")[num], NumberStyles.Any, CultureInfo.InvariantCulture) - 1;
						break;
					}
				}
			}
			Custom.Log("guide to:", text, "karma req:", minKarma.ToString());
			if ((world.game.session as StoryGameSession).saveState.deathPersistentSaveData.karma < minKarma && DestinationRoomVisisted)
			{
				Custom.Log("Progression direction founder killed b/c low karma and have been to destination");
				destroy = true;
			}
			AbstractRoom abstractRoom = world.GetAbstractRoom(showToRoom);
			for (int m = 0; m < abstractRoom.connections.Length; m++)
			{
				checkNext.Add(new IntVector2(abstractRoom.index - world.firstRoomIndex, m));
				matrix[abstractRoom.index - world.firstRoomIndex][m] = 0f;
			}
		}

		public void Update()
		{
			if (done || destroy)
			{
				return;
			}
			if (checkNext.Count < 1)
			{
				done = true;
				return;
			}
			float num = float.MaxValue;
			int num2 = -1;
			for (int i = 0; i < checkNext.Count; i++)
			{
				float num3 = ResistanceOfCell(checkNext[i]);
				if (num3 > -1f && num3 < num)
				{
					num = num3;
					num2 = i;
				}
			}
			if (num2 < 0)
			{
				done = true;
				return;
			}
			if (num2 >= checkNext.Count)
			{
				destroy = true;
				return;
			}
			IntVector2 testCell = checkNext[num2];
			checkNext.RemoveAt(num2);
			AbstractRoom abstractRoom = world.GetAbstractRoom(testCell.x + world.firstRoomIndex);
			float num4 = ResistanceOfCell(testCell);
			for (int j = 0; j < abstractRoom.connections.Length && j < abstractRoom.connections.Length && j < abstractRoom.nodes.Length; j++)
			{
				float num5 = -1f;
				WorldCoordinate worldCoordinate;
				if (j == testCell.y && abstractRoom.connections[j] > -1)
				{
					worldCoordinate = new WorldCoordinate(abstractRoom.connections[j], -1, -1, world.GetAbstractRoom(abstractRoom.connections[j]).ExitIndex(abstractRoom.index));
					num5 = world.TotalShortCutLengthBetweenTwoConnectedRooms(abstractRoom.index, abstractRoom.connections[j]);
				}
				else
				{
					worldCoordinate = new WorldCoordinate(abstractRoom.index, -1, -1, j);
					num5 = abstractRoom.nodes[j].ConnectionLength(testCell.y, StaticWorld.GetCreatureTemplate(CreatureTemplate.Type.Fly));
					if (num5 == -1f)
					{
						num5 = 10000f;
					}
				}
				if (num5 > -1f && matrix[worldCoordinate.room - world.firstRoomIndex][worldCoordinate.abstractNode] == -1f)
				{
					matrix[worldCoordinate.room - world.firstRoomIndex][worldCoordinate.abstractNode] = num4 + num5;
					checkNext.Add(new IntVector2(worldCoordinate.room - world.firstRoomIndex, worldCoordinate.abstractNode));
				}
			}
		}

		private float ResistanceOfCell(IntVector2 testCell)
		{
			if (testCell.x < 0 || testCell.x > world.NumberOfRooms)
			{
				return -1f;
			}
			if (testCell.y < 0 || testCell.y >= matrix[testCell.x].Length)
			{
				return -1f;
			}
			return matrix[testCell.x][testCell.y];
		}

		public float DistanceToDestination(WorldCoordinate testPos)
		{
			if (testPos.room - world.firstRoomIndex < 0 || testPos.room - world.firstRoomIndex > world.NumberOfRooms)
			{
				return -1f;
			}
			return matrix[testPos.room - world.firstRoomIndex][testPos.abstractNode];
		}

		public string StoryRoomInRegion(string currentRegion, bool metMoon)
		{
			string result = "";
			if (currentRegion == "SL")
			{
				result = ((ModManager.MSC && world.game.GetStorySession.saveState.miscWorldSaveData.SLOracleState.shownEnergyCell) ? "GATE_MS_SL" : (metMoon ? "GATE_SH_SL" : "SL_AI"));
				showGateSymbol = false;
			}
			else if (currentRegion == "SS")
			{
				result = "SS_AI";
				showGateSymbol = false;
			}
			else if (ModManager.MSC && currentRegion == "RM")
			{
				result = "RM_CORE";
				showGateSymbol = false;
			}
			return result;
		}

		public List<string> StoryRegionPrioritys(SlugcatStats.Name saveStateNumber, string currentRegion, bool metMoon, bool metPebbles)
		{
			List<string> list = new List<string>();
			if (ModManager.MSC && (saveStateNumber == MoreSlugcatsEnums.SlugcatStatsName.Artificer || saveStateNumber == MoreSlugcatsEnums.SlugcatStatsName.Spear))
			{
				list = new List<string>
				{
					"LF", "SB", "SI", "DS", "SU", "VS", "DM", "LM", "GW", "SH",
					"HI", "CC", "UW", "SS"
				};
			}
			else if (ModManager.MSC && saveStateNumber == MoreSlugcatsEnums.SlugcatStatsName.Rivulet)
			{
				if (!(world.game.session as StoryGameSession).saveState.miscWorldSaveData.pebblesEnergyTaken && (world.game.session as StoryGameSession).saveState.miscWorldSaveData.SSaiConversationsHad > 0)
				{
					list = new List<string>
					{
						"LF", "SB", "SI", "DS", "SU", "VS", "DM", "SL", "GW", "SH",
						"HI", "CC", "UW", "RM"
					};
				}
				else if ((world.game.session as StoryGameSession).saveState.miscWorldSaveData.pebblesEnergyTaken && !world.game.IsMoonActive())
				{
					list = new List<string>
					{
						"UW", "SB", "SI", "CC", "LF", "DS", "SU", "HI", "VS", "SH",
						"GW", "SL"
					};
				}
			}
			else if ((saveStateNumber == SlugcatStats.Name.White || saveStateNumber == SlugcatStats.Name.Yellow) && !metPebbles)
			{
				if (!metMoon)
				{
					list.Add("LF");
					list.Add("UW");
					list.Add("SB");
					list.Add("SI");
					list.Add("CC");
					list.Add("DS");
					list.Add("SU");
					list.Add("HI");
					if (currentRegion != "HI")
					{
						list.Add("VS");
					}
					if (currentRegion != "GW")
					{
						list.Add("SH");
					}
					if (currentRegion != "SH")
					{
						list.Add("GW");
					}
					list.Add("SL");
				}
				else
				{
					list.Add("LF");
					list.Add("SB");
					list.Add("SI");
					list.Add("DS");
					list.Add("CC");
					list.Add("SU");
					if (currentRegion != "SL")
					{
						list.Add("VS");
					}
					list.Add("DM");
					list.Add("SL");
					list.Add("GW");
					list.Add("HI");
					list.Add("SH");
					if (currentRegion != "SL")
					{
						list.Add("UW");
					}
					list.Add("SS");
				}
			}
			return list;
		}

		public string getOverseerStoryGoalRoom(string currentRegion)
		{
			SlugcatStats.Name storyCharacter = world.game.StoryCharacter;
			bool everMetMoon = (world.game.session as StoryGameSession).saveState.miscWorldSaveData.EverMetMoon;
			bool metPebbles = (world.game.session as StoryGameSession).saveState.miscWorldSaveData.SSaiConversationsHad > 0;
			List<string> list = StoryRegionPrioritys(storyCharacter, currentRegion, everMetMoon, metPebbles);
			showGateSymbol = true;
			string text = "";
			if (list.Count == 0)
			{
				destroy = true;
			}
			else
			{
				int num = 0;
				foreach (string item in list)
				{
					if (!(currentRegion != item))
					{
						break;
					}
					num++;
				}
				if (num >= list.Count)
				{
					num = 0;
				}
				if (num == list.Count - 1)
				{
					text = StoryRoomInRegion(currentRegion, everMetMoon);
				}
				else
				{
					for (int i = world.firstRoomIndex; i < world.firstRoomIndex + world.NumberOfRooms; i++)
					{
						int num2 = num;
						AbstractRoom abstractRoom = world.GetAbstractRoom(i);
						if (abstractRoom == null || !abstractRoom.gate)
						{
							continue;
						}
						for (int j = num; j < list.Count; j++)
						{
							if (abstractRoom.name.Contains(list[j]) && j > num2)
							{
								num2 = j;
								text = abstractRoom.name;
							}
						}
					}
				}
			}
			if (text == "")
			{
				destroy = true;
			}
			return text;
		}
	}

	public ShelterFinder shelterFinder;

	public DirectionFinder directionFinder;

	private bool triedAddProgressionFinder;

	public bool guidePlayerToNextRegion;

	public AbstractCreature playerGuide;

	public OverseersWorldAI(World world)
		: base(world)
	{
		shelterFinder = new ShelterFinder(world);
	}

	public override void Update()
	{
		base.Update();
		if (ModManager.MMF && playerGuide != null && world.game.Players.Count > 0 && (world.rainCycle.TimeUntilRain >= 4800 || !playerGuide.ignoreCycle))
		{
			OverseerAbstractAI.DefineTutorialRooms();
			for (int i = 0; i < OverseerAbstractAI.tutorialRooms.Length; i++)
			{
				if (world.game.Players[0].Room.name == OverseerAbstractAI.tutorialRooms[i] && playerGuide.Room.name != OverseerAbstractAI.tutorialRooms[i])
				{
					(playerGuide.abstractAI as OverseerAbstractAI).BringToRoomAndGuidePlayer(world.game.Players[0].Room.index);
					(playerGuide.abstractAI as OverseerAbstractAI).playerGuideCounter = 9000;
					playerGuide.abstractAI.MigrateTo((playerGuide.abstractAI as OverseerAbstractAI).destination);
				}
			}
		}
		if (!shelterFinder.done)
		{
			shelterFinder.Update();
		}
		if (this.directionFinder == null)
		{
			if (!triedAddProgressionFinder)
			{
				triedAddProgressionFinder = true;
				if (guidePlayerToNextRegion && world.game.Players.Count > 0 && world.game.GetStorySession.playerSessionRecords[0].wokeUpInRegion == world.region.name)
				{
					DirectionFinder directionFinder = new DirectionFinder(world);
					if (!directionFinder.destroy)
					{
						this.directionFinder = directionFinder;
					}
				}
				else
				{
					Custom.Log("Guide not taking player anywhere in this region");
				}
			}
		}
		else if (!this.directionFinder.done)
		{
			this.directionFinder.Update();
		}
		DynamicGuideSymbolUpdate();
	}

	public void DitchDirectionGuidance()
	{
		guidePlayerToNextRegion = false;
		directionFinder = null;
	}

	public void DynamicGuideSymbolUpdate()
	{
		if (!ModManager.MSC || !world.game.IsStorySession)
		{
			return;
		}
		SlugcatStats.Name storyCharacter = world.game.StoryCharacter;
		if (storyCharacter == MoreSlugcatsEnums.SlugcatStatsName.Rivulet)
		{
			if (!(world.game.session as StoryGameSession).saveState.miscWorldSaveData.pebblesEnergyTaken)
			{
				world.game.GetStorySession.saveState.miscWorldSaveData.playerGuideState.guideSymbol = 4;
			}
			else if (!(world.game.session as StoryGameSession).saveState.miscWorldSaveData.EverMetMoon || world.region.name != "SL")
			{
				world.game.GetStorySession.saveState.miscWorldSaveData.playerGuideState.guideSymbol = 1;
			}
			else
			{
				world.game.GetStorySession.saveState.miscWorldSaveData.playerGuideState.guideSymbol = 4;
			}
		}
		else if (storyCharacter == MoreSlugcatsEnums.SlugcatStatsName.Artificer || storyCharacter == MoreSlugcatsEnums.SlugcatStatsName.Spear)
		{
			world.game.GetStorySession.saveState.miscWorldSaveData.playerGuideState.guideSymbol = 3;
		}
		else if (storyCharacter == MoreSlugcatsEnums.SlugcatStatsName.Gourmand)
		{
			world.game.GetStorySession.saveState.miscWorldSaveData.playerGuideState.guideSymbol = 0;
		}
	}
}
