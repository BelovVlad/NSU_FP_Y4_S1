using HUD;
using MoreSlugcats;
using RWCustom;
using UnityEngine;
using Watcher;

namespace Menu;

public class KarmaLadderScreen : Menu, IOwnAHUD
{
	public class SleepDeathScreenDataPackage
	{
		public int food;

		public IntVector2 karma;

		public bool karmaReinforced;

		public int playerRoom;

		public Vector2 playerPos;

		public Map.MapData mapData;

		public SlugcatStats characterStats;

		public SaveState saveState;

		public PlayerSessionRecord sessionRecord;

		public bool startMalnourished;

		public bool goalMalnourished;

		public SleepDeathScreenDataPackage(int food, IntVector2 karma, bool karmaReinforced, int playerRoom, Vector2 playerPos, Map.MapData mapData, SaveState saveState, SlugcatStats characterStats, PlayerSessionRecord sessionRecord, bool startMalnourished, bool goalMalnourished)
		{
			this.food = food;
			this.karma = karma;
			this.karmaReinforced = karmaReinforced;
			this.playerRoom = playerRoom;
			this.playerPos = playerPos;
			this.mapData = mapData;
			this.saveState = saveState;
			this.characterStats = characterStats;
			this.sessionRecord = sessionRecord;
			playerPos.y = Mathf.Max(playerPos.y, -50f);
			this.startMalnourished = startMalnourished;
			this.goalMalnourished = goalMalnourished;
		}
	}

	protected IntVector2 karma;

	protected bool karmaReinforced;

	private MenuContainer[] hudContainers;

	public SaveState saveState;

	public int preGhostEncounterKarmaCap = 4;

	public SimpleButton continueButton;

	public KarmaLadder karmaLadder;

	public RippleLadder rippleLadder;

	public WinState winState;

	public FContainer[] ladderContainers;

	public bool playKarmaDream;

	public bool goalMalnourished;

	public DreamsState dreamsState;

	public SleepDeathScreenDataPackage myGamePackage;

	public global::HUD.HUD hud { get; private set; }

	public float ContinueAndExitButtonsXPos => manager.rainWorld.options.ScreenSize.x + (1366f - manager.rainWorld.options.ScreenSize.x) / 2f;

	public float LeftHandButtonsPosXAdd => Custom.LerpMap(manager.rainWorld.options.ScreenSize.x, 1024f, 1280f, 222f, 70f);

	public virtual bool ButtonsGreyedOut => false;

	public virtual bool LadderInCenter => false;

	public bool WatcherMode
	{
		get
		{
			if (ModManager.Watcher && saveState != null && saveState.saveStateNumber == WatcherEnums.SlugcatStatsName.Watcher && saveState.deathPersistentSaveData.maximumRippleLevel >= 1f)
			{
				return !RippleLadderMode;
			}
			return false;
		}
	}

	public bool RippleLadderMode
	{
		get
		{
			if (saveState != null)
			{
				return saveState.warpPointTargetAfterWarpPointSave != null;
			}
			return false;
		}
	}

	public bool UsesWarpMap
	{
		get
		{
			if (!WatcherMode)
			{
				return RippleLadderMode;
			}
			return true;
		}
	}

	public Player.InputPackage MapInput => RWInput.PlayerInput(0);

	public virtual bool RevealMap => false;

	public virtual int CurrentFood => 0;

	public virtual Vector2 MapOwnerInRoomPosition => new Vector2(0f, 0f);

	public virtual int MapOwnerRoom => -1;

	public bool MapDiscoveryActive => false;

	public KarmaLadderScreen(ProcessManager manager, ProcessManager.ProcessID ID)
		: base(manager, ID)
	{
		pages.Add(new Page(this, null, "main", 0));
		selectedObject = null;
	}

	protected virtual void AddBkgIllustration()
	{
	}

	public virtual void InitContainers()
	{
		ladderContainers = new FContainer[3];
		for (int i = 0; i < ladderContainers.Length; i++)
		{
			ladderContainers[i] = new FContainer();
		}
		pages[0].Container.AddChild(ladderContainers[0]);
		pages[0].Container.AddChild(ladderContainers[1]);
		hudContainers = new MenuContainer[2];
		for (int j = 0; j < 2; j++)
		{
			hudContainers[j] = new MenuContainer(this, pages[0], new Vector2(0f, 0f));
			pages[0].subObjects.Add(hudContainers[j]);
		}
		pages[0].Container.AddChild(ladderContainers[2]);
	}

	public virtual void AddSubObjects()
	{
		if (RippleLadderMode)
		{
			rippleLadder = new RippleLadder(this, pages[0], new Vector2(683f, 384f), hud, karma, saveState.deathPersistentSaveData.minimumRippleLevel, saveState.deathPersistentSaveData.maximumRippleLevel, karmaReinforced, GetOwnerType() != global::HUD.HUD.OwnerType.SleepScreen);
			pages[0].subObjects.Add(rippleLadder);
		}
		else if (WatcherMode)
		{
			karmaLadder = new KarmaLadder(this, pages[0], LadderInCenter ? new Vector2(683f, 384f) : new Vector2(350f, 450f), hud, karma, saveState.deathPersistentSaveData.minimumRippleLevel, saveState.deathPersistentSaveData.maximumRippleLevel, karmaReinforced, GetOwnerType() != global::HUD.HUD.OwnerType.SleepScreen);
			pages[0].subObjects.Add(karmaLadder);
		}
		else
		{
			karmaLadder = new KarmaLadder(this, pages[0], LadderInCenter ? new Vector2(683f, 384f) : new Vector2(350f, 450f), hud, karma, karmaReinforced);
			pages[0].subObjects.Add(karmaLadder);
		}
	}

	public void AddContinueButton(bool black)
	{
		continueButton = new SimpleButton(this, pages[0], Translate("CONTINUE"), "CONTINUE", new Vector2(ContinueAndExitButtonsXPos - 180f - manager.rainWorld.options.SafeScreenOffset.x, Mathf.Max(manager.rainWorld.options.SafeScreenOffset.y, 15f)), new Vector2(110f, 30f));
		pages[0].subObjects.Add(continueButton);
		continueButton.black = (black ? 1f : 0f);
		pages[0].lastSelectedObject = continueButton;
	}

	public override void Update()
	{
		base.Update();
		bool flag = hud != null && (hud.map == null || hud.map.fade < 0.5f);
		if ((ID == ProcessManager.ProcessID.Statistics || (karmaLadder != null && !karmaLadder.AllAnimationDone && flag) || (rippleLadder != null && !rippleLadder.AllAnimationDone && flag)) && RWInput.PlayerInput(0).mp)
		{
			framesPerSecond = (ModManager.MMF ? 60 : 200);
		}
		else
		{
			framesPerSecond = 40;
		}
		if (continueButton != null)
		{
			continueButton.buttonBehav.greyedOut = ButtonsGreyedOut;
			continueButton.black = Mathf.Max(0f, continueButton.black - 0.025f);
		}
		if (hud != null)
		{
			hud.Update();
		}
	}

	public override void GrafUpdate(float timeStacker)
	{
		base.GrafUpdate(timeStacker);
		if (hud != null)
		{
			hud.Draw(timeStacker);
		}
	}

	public override void Singal(MenuObject sender, string message)
	{
		switch (message)
		{
		case "CONTINUE":
			if (ModManager.MSC && ID == MoreSlugcatsEnums.ProcessID.KarmaToMinScreen)
			{
				manager.nextSlideshow = MoreSlugcatsEnums.SlideShowID.ArtificerAltEnd;
				manager.statsAfterCredits = true;
				manager.RequestMainProcessSwitch(ProcessManager.ProcessID.SlideShow);
			}
			else if (ModManager.MSC && playKarmaDream && dreamsState != null)
			{
				dreamsState.InitiateEventDream(MoreSlugcatsEnums.DreamID.SaintKarma);
				dreamsState.EndOfCycleProgress(null, "", "");
				manager.RequestMainProcessSwitch(ProcessManager.ProcessID.Dream);
			}
			else
			{
				manager.menuSetup.startGameCondition = ProcessManager.MenuSetup.StoryGameInitCondition.Load;
				StartGame();
			}
			PlaySound(SoundID.MENU_Continue_From_Sleep_Death_Screen);
			break;
		case "EXIT":
			manager.RequestMainProcessSwitch(ProcessManager.ProcessID.MainMenu);
			PlaySound(SoundID.MENU_Switch_Page_Out);
			break;
		}
	}

	public override void ShutDownProcess()
	{
		base.ShutDownProcess();
		for (int i = 0; i < ladderContainers.Length; i++)
		{
			ladderContainers[i].RemoveFromContainer();
		}
		if (hud != null)
		{
			hud.ClearAllSprites();
		}
	}

	public void StartGame()
	{
		if (ModManager.MMF && MMF.cfgLoadingScreenTips.Value && !manager.rainWorld.ExpeditionMode && saveState != null && TipScreen.AnyTipsAvailable(saveState.saveStateNumber, saveState.deathPersistentSaveData.tipCounter) && saveState.deathPersistentSaveData.deaths + saveState.deathPersistentSaveData.survives >= 4 && (saveState.deathPersistentSaveData.deaths + saveState.deathPersistentSaveData.survives) % TipScreen.GetCharacterTipFrequency(saveState.saveStateNumber) == 0)
		{
			manager.RequestMainProcessSwitch(MMFEnums.ProcessID.Tips);
		}
		else
		{
			manager.RequestMainProcessSwitch(ProcessManager.ProcessID.Game);
		}
	}

	public override void CommunicateWithUpcomingProcess(MainLoopProcess nextProcess)
	{
		base.CommunicateWithUpcomingProcess(nextProcess);
		if (ModManager.MSC)
		{
			if (ID == MoreSlugcatsEnums.ProcessID.KarmaToMinScreen || ID == MoreSlugcatsEnums.ProcessID.VengeanceGhostScreen)
			{
				myGamePackage.karma = new IntVector2(0, 0);
			}
			if (nextProcess is DreamScreen)
			{
				(nextProcess as DreamScreen).GetDataFromGame(dreamsState.UpcomingDreamID, null);
			}
			if (nextProcess is ScribbleDreamScreen)
			{
				(nextProcess as ScribbleDreamScreen).GetDataFromGame(dreamsState.UpcomingDreamID, null);
			}
			if (nextProcess is ScribbleDreamScreenOld)
			{
				(nextProcess as ScribbleDreamScreenOld).GetDataFromGame(dreamsState.UpcomingDreamID, null);
			}
			if (nextProcess is TipScreen && saveState != null)
			{
				(nextProcess as TipScreen).GetDataFromGame(saveState.saveStateNumber, saveState.deathPersistentSaveData.tipCounter, saveState.deathPersistentSaveData.tipSeed, goalMalnourished ? 340 : 0);
			}
			if (nextProcess is KarmaLadderScreen)
			{
				(nextProcess as KarmaLadderScreen).GetDataFromGame(myGamePackage);
			}
			if (nextProcess is SlideShow)
			{
				(nextProcess as SlideShow).passthroughPackage = myGamePackage;
			}
		}
		bool flag = ModManager.Watcher && saveState != null && saveState.saveStateNumber == WatcherEnums.SlugcatStatsName.Watcher;
		if (((ModManager.MMF && goalMalnourished) || manager.rainWorld.options.validation || (ModManager.MMF && MMF.cfgFasterShelterOpen.Value)) && nextProcess is RainWorldGame && (nextProcess as RainWorldGame).world != null && (nextProcess as RainWorldGame).world.rainCycle != null && (!ModManager.PrecycleModule || (ModManager.MSC && global::MoreSlugcats.MoreSlugcats.cfgDisablePrecycles.Value && !flag) || (nextProcess as RainWorldGame).world.rainCycle.preTimer == 0))
		{
			(nextProcess as RainWorldGame).world.rainCycle.timer = 340;
		}
	}

	public virtual void GetDataFromGame(SleepDeathScreenDataPackage package)
	{
		Custom.Log($"{ID} screen get data from game! karma: {package.karma} reinf: {package.karmaReinforced} sMal:{package.startMalnourished} gMal:{package.goalMalnourished}");
		karma = new IntVector2(Custom.IntClamp(package.karma.x + ((ID == ProcessManager.ProcessID.SleepScreen && package.karma.y < 100) ? (-1) : 0), 0, package.karma.y), package.karma.y);
		karmaReinforced = package.karmaReinforced;
		saveState = package.saveState;
		myGamePackage = package;
		playKarmaDream = false;
		goalMalnourished = package.goalMalnourished;
		dreamsState = null;
		if (package.saveState != null)
		{
			winState = package.saveState.deathPersistentSaveData.winState;
			if (ModManager.MSC)
			{
				if (saveState.saveStateNumber == MoreSlugcatsEnums.SlugcatStatsName.Artificer)
				{
					preGhostEncounterKarmaCap = 0;
				}
				else if (saveState.saveStateNumber == MoreSlugcatsEnums.SlugcatStatsName.Saint)
				{
					preGhostEncounterKarmaCap = 1;
					if (!saveState.karmaDream && package.karma.y == 9 && saveState.dreamsState != null && !goalMalnourished)
					{
						if (ID == ProcessManager.ProcessID.GhostScreen)
						{
							playKarmaDream = true;
							dreamsState = saveState.dreamsState;
						}
						saveState.karmaDream = true;
					}
					if (this is StoryGameStatisticsScreen)
					{
						karma.x = 1;
						karma.y = 1;
					}
				}
			}
		}
		AddBkgIllustration();
		InitContainers();
		hud = new global::HUD.HUD(new FContainer[2]
		{
			hudContainers[1].Container,
			hudContainers[0].Container
		}, manager.rainWorld, this);
		AddSubObjects();
	}

	public virtual void FoodCountDownDone()
	{
		if (karmaLadder != null)
		{
			karmaLadder.startedAnimating = true;
		}
		if (rippleLadder != null)
		{
			rippleLadder.startedAnimating = true;
		}
	}

	public global::HUD.HUD.OwnerType GetOwnerType()
	{
		if (ID == ProcessManager.ProcessID.SleepScreen)
		{
			return global::HUD.HUD.OwnerType.SleepScreen;
		}
		return global::HUD.HUD.OwnerType.DeathScreen;
	}

	public void PlayHUDSound(SoundID soundID)
	{
		PlaySound(soundID);
	}
}
