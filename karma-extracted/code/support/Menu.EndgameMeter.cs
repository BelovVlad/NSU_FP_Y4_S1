using System;
using System.Collections.Generic;
using HUD;
using Modding.Passages;
using MoreSlugcats;
using RWCustom;
using UnityEngine;

namespace Menu;

public class EndgameMeter : PositionedMenuObject
{
	public abstract class Meter
	{
		public EndgameMeter owner;

		public FSprite stickSprite;

		public float extended;

		public float lastExtended;

		protected Vector2 symbolPos;

		protected Vector2 ladderCenter;

		protected Vector2 meterTip;

		protected Vector2 meterStart;

		public float pulse;

		public Color EmptyColor(float timeStacker)
		{
			return AllColorsViaThis(Menu.MenuColor(Menu.MenuColors.VeryDarkGrey).rgb, timeStacker);
		}

		public Color FilledColor(float timeStacker)
		{
			return AllColorsViaThis(Menu.MenuColor(Menu.MenuColors.DarkGrey).rgb, timeStacker);
		}

		public Color GainColor(float timeStacker, float colorCue)
		{
			return AllColorsViaThis(Color.Lerp(FilledColor(timeStacker), Menu.MenuColor(Menu.MenuColors.MediumGrey).rgb, pulse * colorCue * (owner.fullfilledNow ? (1f - owner.showAsFullfilled) : 1f)), timeStacker);
		}

		public Color LossColor(float timeStacker, float colorCue)
		{
			return AllColorsViaThis(Color.Lerp(EmptyColor(timeStacker), new Color(1f, 0f, 0f), (1f - pulse) * 0.5f * colorCue), timeStacker);
		}

		public float Alpha(float timeStacker)
		{
			return Mathf.Pow(Mathf.InverseLerp(0.5f, 1f, Mathf.Lerp(owner.lastEnergy, owner.energy, timeStacker)), 2f) * Mathf.Lerp(lastExtended, extended, timeStacker);
		}

		public Color AllColorsViaThis(Color color, float timeStacker)
		{
			if (owner.showAsFullfilled > 0f && owner.fullfilledNow)
			{
				color = Color.Lerp(color, Color.Lerp(Menu.MenuRGB(Menu.MenuColors.MediumGrey), Menu.MenuColor(Menu.MenuColors.White).rgb, 0.5f), pulse * owner.showAsFullfilled);
			}
			if (owner.energy < 1f)
			{
				color = Color.Lerp(Menu.MenuRGB(Menu.MenuColors.Black), color, Mathf.Pow(Alpha(timeStacker), 0.5f));
			}
			return color;
		}

		public Meter(EndgameMeter owner)
		{
			this.owner = owner;
			stickSprite = new FSprite("pixel");
			stickSprite.scaleX = 2f;
			stickSprite.anchorY = 0f;
			owner.bkgContainer.AddChild(stickSprite);
		}

		public virtual void Update()
		{
			lastExtended = extended;
			extended = Custom.LerpAndTick(extended, owner.poweredOn ? 1f : 0f, 0.05f, 1f / Mathf.Lerp(600f, 10f, owner.energy));
		}

		public virtual void GrafUpdate(float timeStacker)
		{
			symbolPos = owner.DrawPos(timeStacker);
			ladderCenter = owner.ladder.DrawPos(timeStacker);
			meterTip = symbolPos + Custom.DirVec(symbolPos, ladderCenter) * 35f;
			meterStart = Custom.VerticalCrossPoint(ladderCenter, meterTip, ladderCenter.x + Mathf.Sign(meterTip.x - ladderCenter.x) * 50f);
			meterTip = Vector2.Lerp(meterStart, meterTip, Custom.SCurve(Mathf.Lerp(lastExtended, extended, timeStacker), 0.6f));
			pulse = 0.5f + 0.5f * Mathf.Sin(Mathf.Lerp(owner.lastPulse, owner.pulse, timeStacker) / 60f * (float)Math.PI * 2f);
			stickSprite.x = meterStart.x;
			stickSprite.y = meterStart.y;
			stickSprite.scaleY = Vector2.Distance(meterStart, meterTip);
			stickSprite.rotation = Custom.AimFromOneVectorToAnother(meterStart, meterTip);
			stickSprite.color = EmptyColor(timeStacker);
		}

		public virtual void RemoveSprites()
		{
			stickSprite.RemoveFromContainer();
		}
	}

	public class FloatMeter : Meter
	{
		public FSprite sideBarSprite;

		public FSprite tipSprite;

		public FSprite[] meterSprites;

		private float fill;

		private float lastFill;

		public int changeDirection;

		public FloatMeter(EndgameMeter owner)
			: base(owner)
		{
			sideBarSprite = new FSprite("pixel");
			sideBarSprite.scaleX = 8f;
			sideBarSprite.scaleY = 2f;
			sideBarSprite.anchorY = 1f;
			owner.bkgContainer.AddChild(sideBarSprite);
			tipSprite = new FSprite("pixel");
			tipSprite.scaleX = 4f;
			tipSprite.scaleY = 2f;
			tipSprite.anchorY = 1f;
			owner.mainContainer.AddChild(tipSprite);
			meterSprites = new FSprite[2];
			for (int i = 0; i < 2; i++)
			{
				meterSprites[i] = new FSprite("pixel");
				meterSprites[i].scaleX = 2f;
				meterSprites[i].anchorY = 0f;
			}
			if (owner.tracker is WinState.BoolArrayTracker)
			{
				fill = 0f;
				lastFill = 0f;
				for (int j = 0; j < (owner.tracker as WinState.BoolArrayTracker).progress.Length; j++)
				{
					if ((owner.tracker as WinState.BoolArrayTracker).progress[j])
					{
						fill += 1f;
					}
					if ((owner.tracker as WinState.BoolArrayTracker).lastShownProgress[j])
					{
						lastFill += 1f;
					}
				}
				fill /= (owner.tracker as WinState.BoolArrayTracker).progress.Length;
				lastFill /= (owner.tracker as WinState.BoolArrayTracker).progress.Length;
			}
			if (owner.tracker is WinState.ListTracker)
			{
				fill = (float)(owner.tracker as WinState.ListTracker).myList.Count / (float)(owner.tracker as WinState.ListTracker).totItemsToWin;
				lastFill = (float)(owner.tracker as WinState.ListTracker).myLastList.Count / (float)(owner.tracker as WinState.ListTracker).totItemsToWin;
			}
			if (owner.tracker is WinState.FloatTracker)
			{
				fill = Mathf.InverseLerp((owner.tracker as WinState.FloatTracker).showFrom, (owner.tracker as WinState.FloatTracker).max, (owner.tracker as WinState.FloatTracker).progress);
				lastFill = Mathf.InverseLerp((owner.tracker as WinState.FloatTracker).showFrom, (owner.tracker as WinState.FloatTracker).max, (owner.tracker as WinState.FloatTracker).lastShownProgress);
			}
			else if (owner.tracker is WinState.IntegerTracker)
			{
				fill = Mathf.InverseLerp((owner.tracker as WinState.IntegerTracker).showFrom, (owner.tracker as WinState.IntegerTracker).max, (owner.tracker as WinState.IntegerTracker).progress);
				lastFill = Mathf.InverseLerp((owner.tracker as WinState.IntegerTracker).showFrom, (owner.tracker as WinState.IntegerTracker).max, (owner.tracker as WinState.IntegerTracker).lastShownProgress);
			}
			if (fill < lastFill)
			{
				changeDirection = -1;
			}
			else if (fill > lastFill)
			{
				changeDirection = 1;
			}
			if (changeDirection > -1)
			{
				owner.mainContainer.AddChild(meterSprites[0]);
			}
			else
			{
				owner.bkgContainer.AddChild(meterSprites[0]);
			}
			owner.mainContainer.AddChild(meterSprites[1]);
		}

		public override void GrafUpdate(float timeStacker)
		{
			base.GrafUpdate(timeStacker);
			sideBarSprite.x = meterTip.x;
			sideBarSprite.y = meterTip.y;
			sideBarSprite.rotation = Custom.AimFromOneVectorToAnother(meterStart, meterTip);
			sideBarSprite.color = EmptyColor(timeStacker);
			float num = Mathf.Lerp(owner.lastMeterAnimation, owner.meterAnimation, timeStacker);
			float num2 = Mathf.Pow(Mathf.InverseLerp(0.5f, 1f, num), 3f);
			if ((owner.menu as KarmaLadderScreen).hud != null && (owner.menu as KarmaLadderScreen).hud.map != null)
			{
				num2 *= 1f - Mathf.Lerp((owner.menu as KarmaLadderScreen).hud.map.lastFade, (owner.menu as KarmaLadderScreen).hud.map.fade, timeStacker);
			}
			float num3 = Mathf.Lerp(lastFill, fill, Custom.SCurve(Mathf.Pow(num, 0.65f), 0.4f));
			float alpha = Alpha(timeStacker);
			tipSprite.x = Mathf.Lerp(meterStart.x, meterTip.x, num3);
			tipSprite.y = Mathf.Lerp(meterStart.y, meterTip.y, num3);
			tipSprite.rotation = Custom.AimFromOneVectorToAnother(meterStart, meterTip);
			tipSprite.color = EmptyColor(timeStacker);
			tipSprite.alpha = alpha;
			meterSprites[1].color = FilledColor(timeStacker);
			for (int i = 0; i < 2; i++)
			{
				meterSprites[i].x = meterStart.x;
				meterSprites[i].y = meterStart.y;
				meterSprites[i].rotation = Custom.AimFromOneVectorToAnother(meterStart, meterTip);
				meterSprites[i].alpha = alpha;
			}
			if (changeDirection < 0)
			{
				meterSprites[0].color = LossColor(timeStacker, num2);
				tipSprite.color = FilledColor(timeStacker);
				meterSprites[0].scaleY = Vector2.Distance(meterStart, meterTip) * lastFill;
				meterSprites[1].scaleY = Vector2.Distance(meterStart, meterTip) * num3;
			}
			else if (changeDirection > 0)
			{
				meterSprites[0].color = GainColor(timeStacker, num2);
				tipSprite.color = GainColor(timeStacker, num2);
				meterSprites[0].scaleY = Vector2.Distance(meterStart, meterTip) * num3;
				meterSprites[1].scaleY = Vector2.Distance(meterStart, meterTip) * lastFill;
			}
			else
			{
				tipSprite.color = FilledColor(timeStacker);
				meterSprites[1].scaleY = Vector2.Distance(meterStart, meterTip) * num3;
			}
		}

		public override void RemoveSprites()
		{
			base.RemoveSprites();
			sideBarSprite.RemoveFromContainer();
			tipSprite.RemoveFromContainer();
			for (int i = 0; i < 2; i++)
			{
				meterSprites[i].RemoveFromContainer();
			}
		}
	}

	public class NotchMeter : Meter
	{
		public FSprite[,] notchSprites;

		public Color[] customColors;

		public float[,] pop;

		public WinState.ListTracker listTracker => owner.tracker as WinState.ListTracker;

		public WinState.BoolArrayTracker boolArrayTracker => owner.tracker as WinState.BoolArrayTracker;

		public WinState.IntegerTracker integerTracker => owner.tracker as WinState.IntegerTracker;

		public bool isBoolArray => owner.tracker is WinState.BoolArrayTracker;

		public bool isList => owner.tracker is WinState.ListTracker;

		private bool NotchFilled(int i)
		{
			if (isList)
			{
				return i < listTracker.myList.Count;
			}
			if (isBoolArray)
			{
				return boolArrayTracker.progress[i];
			}
			return integerTracker.progress - integerTracker.showFrom > i;
		}

		private bool NotchLastFilled(int i)
		{
			if (isList)
			{
				return i < listTracker.myLastList.Count;
			}
			if (isBoolArray)
			{
				return boolArrayTracker.lastShownProgress[i];
			}
			return integerTracker.lastShownProgress - integerTracker.showFrom > i;
		}

		public NotchMeter(EndgameMeter owner)
			: base(owner)
		{
			if (isList)
			{
				notchSprites = new FSprite[listTracker.totItemsToWin, 4];
			}
			else if (isBoolArray)
			{
				notchSprites = new FSprite[boolArrayTracker.progress.Length, 4];
			}
			else
			{
				notchSprites = new FSprite[this.integerTracker.max - this.integerTracker.showFrom, 4];
			}
			for (int i = 0; i < notchSprites.GetLength(0); i++)
			{
				notchSprites[i, 0] = new FSprite("JetFishEyeA");
				notchSprites[i, 1] = new FSprite("haloGlyph-1");
				notchSprites[i, 2] = new FSprite("haloGlyph-1");
				notchSprites[i, 3] = new FSprite("Futile_White");
				notchSprites[i, 3].shader = owner.menu.manager.rainWorld.Shaders["FlatLight"];
				owner.mainContainer.AddChild(notchSprites[i, 0]);
				owner.mainContainer.AddChild(notchSprites[i, 1]);
			}
			for (int j = 0; j < notchSprites.GetLength(0); j++)
			{
				owner.mainContainer.AddChild(notchSprites[j, 2]);
				owner.mainContainer.AddChild(notchSprites[j, 3]);
			}
			if (owner.tracker.ID == WinState.EndgameID.DragonSlayer)
			{
				customColors = new Color[(ModManager.MSC || ModManager.Watcher) ? listTracker.totItemsToWin : boolArrayTracker.progress.Length];
				for (int k = 0; k < customColors.Length; k++)
				{
					if (!ModManager.MSC && !ModManager.Watcher)
					{
						customColors[k] = (StaticWorld.GetCreatureTemplate(WinState.lizardsOrder[k]).breedParameters as LizardBreedParams).standardColor;
					}
					else if (k < listTracker.myList.Count)
					{
						customColors[k] = (StaticWorld.GetCreatureTemplate(WinState.lizardsOrder[listTracker.myList[k]]).breedParameters as LizardBreedParams).standardColor;
					}
					else
					{
						customColors[k] = Color.black;
					}
				}
			}
			else if (owner.tracker.ID == WinState.EndgameID.Scholar)
			{
				customColors = new Color[listTracker.totItemsToWin];
				for (int l = 0; l < listTracker.myList.Count; l++)
				{
					string entry = ExtEnum<DataPearl.AbstractDataPearl.DataPearlType>.values.GetEntry(listTracker.myList[l]);
					Color color = DataPearl.UniquePearlMainColor(DataPearl.AbstractDataPearl.DataPearlType.Misc);
					Color? color2 = null;
					if (entry != null)
					{
						DataPearl.AbstractDataPearl.DataPearlType pearlType = new DataPearl.AbstractDataPearl.DataPearlType(entry);
						color = DataPearl.UniquePearlMainColor(pearlType);
						color2 = DataPearl.UniquePearlHighLightColor(pearlType);
					}
					if (color2.HasValue)
					{
						customColors[l] = Color.Lerp(color, color2.Value, 0.4f);
					}
					else
					{
						customColors[l] = color;
					}
					customColors[l] = Custom.Saturate(customColors[l], 0.2f);
				}
			}
			if (ModManager.MMF && owner.tracker.ID == WinState.EndgameID.Traveller)
			{
				customColors = new Color[boolArrayTracker.progress.Length];
				for (int m = 0; m < customColors.Length; m++)
				{
					customColors[m] = Region.RegionColor(SlugcatStats.SlugcatStoryRegions(RainWorld.lastActiveSaveSlot)[m]);
				}
			}
			if (ModManager.MSC)
			{
				if (owner.tracker.ID == MoreSlugcatsEnums.EndgameID.Pilgrim)
				{
					customColors = new Color[boolArrayTracker.progress.Length];
					List<string> list = SlugcatStats.SlugcatStoryRegions(RainWorld.lastActiveSaveSlot);
					int num = 0;
					for (int n = 0; n < list.Count; n++)
					{
						if (World.CheckForRegionGhost(RainWorld.lastActiveSaveSlot, list[n]))
						{
							customColors[num] = Region.RegionColor(list[n]);
							num++;
						}
					}
				}
				else if (owner.tracker.ID == MoreSlugcatsEnums.EndgameID.Nomad)
				{
					customColors = new Color[listTracker.totItemsToWin];
					List<string> fullRegionOrder = Region.GetFullRegionOrder();
					for (int num2 = 0; num2 < listTracker.totItemsToWin; num2++)
					{
						if (num2 < listTracker.myList.Count)
						{
							customColors[num2] = Region.RegionColor(fullRegionOrder[listTracker.myList[num2]]);
						}
						else
						{
							customColors[num2] = Color.black;
						}
					}
				}
			}
			if (isList)
			{
				pop = new float[listTracker.totItemsToWin, 2];
			}
			else if (isBoolArray)
			{
				pop = new float[boolArrayTracker.progress.Length, 2];
			}
			else
			{
				pop = new float[this.integerTracker.max - this.integerTracker.showFrom, 2];
			}
			CustomPassage customPassage = CustomPassages.PassageForID(owner.tracker.ID);
			if (customPassage?.NotchColors == null)
			{
				return;
			}
			customColors = new Color[customPassage.NotchColors.Length];
			if (isList)
			{
				for (int num3 = 0; num3 < customColors.Length; num3++)
				{
					customColors[num3] = ((num3 < listTracker.myList.Count) ? customPassage.NotchColors[listTracker.myList[num3]] : Color.black);
				}
			}
			else if (isBoolArray)
			{
				for (int num4 = 0; num4 < customColors.Length; num4++)
				{
					customColors[num4] = ((num4 < boolArrayTracker.progress.Length && boolArrayTracker.progress[num4]) ? customPassage.NotchColors[num4] : Color.black);
				}
			}
			else if (owner.tracker is WinState.IntegerTracker integerTracker)
			{
				for (int num5 = 0; num5 < customColors.Length; num5++)
				{
					customColors[num5] = ((num5 < integerTracker.progress) ? customPassage.NotchColors[integerTracker.progress - 1] : Color.black);
				}
			}
		}

		public override void Update()
		{
			base.Update();
			for (int i = 0; i < notchSprites.GetLength(0); i++)
			{
				pop[i, 1] = pop[i, 0];
				float num = (float)(i + 1) / (float)notchSprites.GetLength(0);
				if (owner.lastMeterAnimation < num && owner.meterAnimation >= num)
				{
					if (NotchFilled(i) && !NotchLastFilled(i))
					{
						pop[i, 0] = 0.01f;
						owner.menu.PlaySound(SoundID.MENU_Endgame_Notch_Meter_Slot_Fill, 0f, 1f, 1f);
					}
					else if (!NotchFilled(i) && NotchLastFilled(i))
					{
						pop[i, 0] = -1f;
					}
				}
				if (pop[i, 0] > 0f)
				{
					pop[i, 0] = Mathf.Min(1f, pop[i, 0] + 0.1f);
				}
			}
		}

		public override void GrafUpdate(float timeStacker)
		{
			base.GrafUpdate(timeStacker);
			float num = Alpha(timeStacker);
			for (int i = 0; i < notchSprites.GetLength(0); i++)
			{
				float num2 = Mathf.Lerp(pop[i, 1], pop[i, 0], timeStacker);
				Vector2 vector = Vector2.Lerp(meterStart, meterTip, (float)(i + 1) / (float)notchSprites.GetLength(0));
				vector.x = Mathf.Floor(vector.x) + 0.5f;
				vector.y = Mathf.Floor(vector.y) + 0.5f;
				for (int j = 0; j < 4; j++)
				{
					notchSprites[i, j].x = vector.x;
					notchSprites[i, j].y = vector.y;
					notchSprites[i, j].alpha = num;
				}
				if (NotchLastFilled(i) && !NotchFilled(i))
				{
					notchSprites[i, 1].isVisible = true;
					notchSprites[i, 2].color = LossColor(timeStacker, 1f);
					notchSprites[i, 2].alpha = (1f - pulse) * 0.5f;
					notchSprites[i, 2].isVisible = true;
					notchSprites[i, 3].isVisible = false;
				}
				else if ((NotchFilled(i) && (num2 > 0f || NotchLastFilled(i))) || (NotchLastFilled(i) && (num2 != -1f || NotchFilled(i))))
				{
					notchSprites[i, 2].isVisible = true;
					if (customColors == null)
					{
						if (!NotchLastFilled(i))
						{
							notchSprites[i, 2].color = GainColor(timeStacker, 1f);
						}
						else
						{
							notchSprites[i, 2].color = FilledColor(timeStacker);
						}
					}
					else if (!NotchLastFilled(i))
					{
						notchSprites[i, 2].color = GainColor(timeStacker, 1f);
					}
					else
					{
						notchSprites[i, 2].color = Color.Lerp(AllColorsViaThis(customColors[i], timeStacker), FilledColor(timeStacker), 0.5f);
					}
					if (!NotchLastFilled(i))
					{
						notchSprites[i, 3].isVisible = true;
						notchSprites[i, 3].scale = 0.7f + 0.5f * Mathf.Lerp(pulse, 2f, Mathf.Sin(Mathf.Pow(num2, 0.5f) * (float)Math.PI));
						notchSprites[i, 3].alpha = Mathf.Lerp(Mathf.Lerp(0.15f, 0.3f, pulse), 0.7f, Mathf.Sin(Mathf.Pow(num2, 0.5f) * (float)Math.PI)) * num;
						if (customColors != null)
						{
							notchSprites[i, 3].color = Color.Lerp(AllColorsViaThis(customColors[i], timeStacker), new Color(1f, 1f, 1f), 0.5f);
						}
					}
					else
					{
						notchSprites[i, 3].isVisible = false;
					}
				}
				else
				{
					notchSprites[i, 2].isVisible = false;
					notchSprites[i, 3].isVisible = false;
				}
				notchSprites[i, 0].color = EmptyColor(timeStacker);
				notchSprites[i, 1].color = Menu.MenuRGB(Menu.MenuColors.Black);
			}
		}
	}

	public WinState.EndgameTracker tracker;

	private FSprite symbolSprite;

	private FSprite circleSprite;

	private FSprite glowSprite;

	private FLabel label;

	public float pulse;

	public float lastPulse;

	public Meter meter;

	public float energy;

	public float lastEnergy;

	public int flickerCounter;

	public bool poweredOn;

	public FContainer bkgContainer;

	public FContainer mainContainer;

	public float meterAnimation;

	public float lastMeterAnimation;

	public float animationLightUp;

	public float lastAnimationLightUp;

	public float showAsFullfilled;

	public float lastShowAsFullFilled;

	public bool fullfilledNow;

	private bool showPositiveChange;

	public KarmaLadder ladder => owner as KarmaLadder;

	public EndgameMeter(Menu menu, MenuObject owner, Vector2 pos, WinState.EndgameTracker tracker, FContainer bkgContainer, FContainer mainContainer)
		: base(menu, owner, pos)
	{
		this.tracker = tracker;
		this.bkgContainer = bkgContainer;
		this.mainContainer = mainContainer;
		fullfilledNow = menu.ID != ProcessManager.ProcessID.Statistics && tracker.GoalFullfilled && !tracker.GoalAlreadyFullfilled;
		showAsFullfilled = ((tracker.GoalFullfilled && tracker.GoalAlreadyFullfilled) ? 1f : 0f);
		lastShowAsFullFilled = showAsFullfilled;
		symbolSprite = new FSprite(tracker.ID.ToString() + ((showAsFullfilled > 0.5f) ? "A" : "B"));
		mainContainer.AddChild(symbolSprite);
		circleSprite = new FSprite("EndGameCircle");
		glowSprite = new FSprite("Futile_White");
		glowSprite.shader = menu.manager.rainWorld.Shaders["FlatLight"];
		FTextParams fTextParams = new FTextParams();
		if (InGameTranslator.LanguageID.UsesLargeFont(Custom.rainWorld.inGameTranslator.currentLanguage))
		{
			fTextParams.lineHeightOffset = -12f;
		}
		else
		{
			fTextParams.lineHeightOffset = -3f;
		}
		string text = "";
		label = new FLabel(text: Custom.ReplaceLineDelimeters((!menu.manager.rainWorld.inGameTranslator.HasShortstringTranslation(WinState.PassageDisplayName(tracker.ID) + "-linebreaks")) ? menu.Translate(WinState.PassageDisplayName(tracker.ID)) : menu.Translate(WinState.PassageDisplayName(tracker.ID) + "-linebreaks")), fontName: Custom.GetFont(), textParams: fTextParams);
		mainContainer.AddChild(label);
		mainContainer.AddChild(circleSprite);
		mainContainer.AddChild(glowSprite);
		if (tracker.ID == WinState.EndgameID.Survivor)
		{
			meter = new NotchMeter(this);
		}
		else
		{
			CustomPassage customPassage = CustomPassages.PassageForID(tracker.ID);
			if (customPassage != null && customPassage.IsNotched)
			{
				meter = new NotchMeter(this);
			}
			else if (tracker is WinState.BoolArrayTracker)
			{
				if ((tracker as WinState.BoolArrayTracker).progress.Length >= 15)
				{
					meter = new FloatMeter(this);
				}
				else
				{
					meter = new NotchMeter(this);
				}
			}
			else if (tracker is WinState.ListTracker)
			{
				if ((tracker as WinState.ListTracker).totItemsToWin >= 15)
				{
					meter = new FloatMeter(this);
				}
				else
				{
					meter = new NotchMeter(this);
				}
			}
			else
			{
				meter = new FloatMeter(this);
			}
		}
		if (!AnyChangeToShow())
		{
			return;
		}
		if (tracker is WinState.BoolArrayTracker)
		{
			for (int i = 0; i < (tracker as WinState.BoolArrayTracker).progress.Length; i++)
			{
				if ((tracker as WinState.BoolArrayTracker).progress[i] != (tracker as WinState.BoolArrayTracker).lastShownProgress[i])
				{
					showPositiveChange = true;
				}
			}
		}
		else if (tracker is WinState.IntegerTracker)
		{
			showPositiveChange = (tracker as WinState.IntegerTracker).lastShownProgress < (tracker as WinState.IntegerTracker).progress;
		}
		else if (tracker is WinState.FloatTracker)
		{
			showPositiveChange = (tracker as WinState.FloatTracker).lastShownProgress < (tracker as WinState.FloatTracker).progress;
		}
		else if (ModManager.MMF && tracker is WinState.ListTracker)
		{
			showPositiveChange = (tracker as WinState.ListTracker).myLastList.Count < (tracker as WinState.ListTracker).myList.Count;
		}
	}

	public void ScoreFlash()
	{
		fullfilledNow = true;
		ladder.hud.fadeCircles.Add(new FadeCircle(ladder.hud, 10f, 12f, 0.88f, 60f, 3f, DrawPos(1f), (menu as KarmaLadderScreen).ladderContainers[2]));
		ladder.menu.PlaySound(SoundID.MENU_Endgame_Meter_Multiply_Bump);
	}

	public bool AnyChangeToShow()
	{
		if (tracker is WinState.BoolArrayTracker)
		{
			for (int i = 0; i < (tracker as WinState.BoolArrayTracker).progress.Length; i++)
			{
				if ((tracker as WinState.BoolArrayTracker).progress[i] != (tracker as WinState.BoolArrayTracker).lastShownProgress[i])
				{
					return true;
				}
			}
			return false;
		}
		if (tracker is WinState.IntegerTracker)
		{
			return (tracker as WinState.IntegerTracker).lastShownProgress != (tracker as WinState.IntegerTracker).progress;
		}
		if (tracker is WinState.FloatTracker)
		{
			return (tracker as WinState.FloatTracker).lastShownProgress != (tracker as WinState.FloatTracker).progress;
		}
		if (ModManager.MMF && tracker is WinState.ListTracker)
		{
			return (tracker as WinState.ListTracker).myLastList.Count != (tracker as WinState.ListTracker).myList.Count;
		}
		return false;
	}

	public override void Update()
	{
		base.Update();
		lastPulse = pulse;
		pulse += 1f;
		lastEnergy = energy;
		if (poweredOn)
		{
			if (UnityEngine.Random.value > Mathf.InverseLerp(5f, 40f, flickerCounter))
			{
				energy = Custom.LerpAndTick(energy, 1f, 0.1f, 1f / 70f);
			}
			if (flickerCounter > 0)
			{
				flickerCounter--;
				if (UnityEngine.Random.value < Mathf.InverseLerp(5f, 19f, flickerCounter))
				{
					energy = Mathf.Min(energy, Mathf.Lerp(energy, Mathf.Pow(UnityEngine.Random.value, Custom.LerpMap(flickerCounter, 50f, 2f, 3f, 0.2f)), 0.5f));
				}
			}
		}
		else
		{
			energy = 0f;
		}
		lastMeterAnimation = meterAnimation;
		if (meterAnimation > 0f && energy > 0.99f)
		{
			meterAnimation = Mathf.Min(1f, meterAnimation + 1f / 62f);
		}
		lastShowAsFullFilled = showAsFullfilled;
		if (meterAnimation == 1f && fullfilledNow)
		{
			if (showAsFullfilled == 0f)
			{
				menu.PlaySound(SoundID.MENU_Endgame_Meter_Fullfilled);
				symbolSprite.element = Futile.atlasManager.GetElementWithName(CustomPassages.PassageForID(tracker.ID)?.SpriteName ?? (tracker.ID.ToString() + "A"));
				menu.manager.CueAchievement(WinState.PassageAchievementID(tracker.ID), 6f);
			}
			showAsFullfilled = Mathf.Min(1f, showAsFullfilled + 1f / 24f);
		}
		lastAnimationLightUp = animationLightUp;
		if ((showPositiveChange && meterAnimation > 0f && meterAnimation < 1f) || (meterAnimation > 0f && fullfilledNow))
		{
			animationLightUp = Custom.LerpAndTick(animationLightUp, 1f, 0.05f, 0.0125f);
		}
		else
		{
			animationLightUp = Custom.LerpAndTick(animationLightUp, 0f, 0.001f, 0.004166667f);
		}
		meter.Update();
	}

	public override void GrafUpdate(float timeStacker)
	{
		base.GrafUpdate(timeStacker);
		Vector2 vector = DrawPos(timeStacker);
		float num = Mathf.Lerp(lastEnergy, energy, timeStacker);
		float num2 = Mathf.Lerp(lastShowAsFullFilled, showAsFullfilled, timeStacker);
		float num3 = Mathf.Lerp(lastAnimationLightUp, animationLightUp, timeStacker);
		Color color = Color.Lerp(Menu.MenuRGB(Menu.MenuColors.VeryDarkGrey), Menu.MenuRGB(fullfilledNow ? Menu.MenuColors.White : Menu.MenuColors.MediumGrey), Mathf.Max(Mathf.Pow(num2, 0.2f), num3));
		symbolSprite.x = vector.x;
		symbolSprite.y = vector.y;
		symbolSprite.color = color;
		symbolSprite.alpha = num;
		circleSprite.x = vector.x;
		circleSprite.y = vector.y;
		circleSprite.color = Menu.MenuRGB(Menu.MenuColors.MediumGrey);
		circleSprite.alpha = Mathf.Pow(num2, 0.1f) * num;
		circleSprite.color = color;
		label.y = vector.y;
		label.color = color;
		label.alpha = num * num3;
		if (vector.x > ladder.DrawX(timeStacker))
		{
			label.x = vector.x + 25f;
			label.alignment = FLabelAlignment.Left;
		}
		else
		{
			label.x = vector.x - 25f;
			label.alignment = FLabelAlignment.Right;
		}
		glowSprite.x = vector.x;
		glowSprite.y = vector.y;
		glowSprite.alpha = (0.2f * showAsFullfilled + 0.2f * Mathf.Sin(Mathf.Pow(num2, 0.3f) * (float)Math.PI) + (fullfilledNow ? (0.1f * num2) : 0f)) * num;
		glowSprite.scale = (90f + 20f * Mathf.Sin(Mathf.Pow(num2, 0.3f) * (float)Math.PI) + (fullfilledNow ? (5f + meter.pulse * 20f * num2) : 0f)) / 16f;
		meter.GrafUpdate(timeStacker);
	}

	public override void RemoveSprites()
	{
		base.RemoveSprites();
		meter.RemoveSprites();
	}
}
