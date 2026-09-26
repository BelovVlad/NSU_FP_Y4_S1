using System.Collections.Generic;
using System.IO;
using MoreSlugcats;
using RWCustom;
using UnityEngine;

namespace OverseerHolograms;

public class OverseerImage : OverseerHologram, IOwnAHoloImage
{
	public class ImageID : ExtEnum<ImageID>
	{
		public static readonly ImageID Moon_Full_Figure = new ImageID("Moon_Full_Figure", register: true);

		public static readonly ImageID Moon_Double_Size = new ImageID("Moon_Double_Size", register: true);

		public static readonly ImageID Moon_Portrait = new ImageID("Moon_Portrait", register: true);

		public static readonly ImageID Slugcat_1 = new ImageID("Slugcat_1", register: true);

		public static readonly ImageID Slugcat_2 = new ImageID("Slugcat_2", register: true);

		public static readonly ImageID Slugcat_3 = new ImageID("Slugcat_3", register: true);

		public static readonly ImageID Slugcat_4 = new ImageID("Slugcat_4", register: true);

		public static readonly ImageID Slugcat_5 = new ImageID("Slugcat_5", register: true);

		public static readonly ImageID Slugcat_6 = new ImageID("Slugcat_6", register: true);

		public static readonly ImageID Slugcat_7 = new ImageID("Slugcat_7", register: true);

		public static readonly ImageID Clue_1 = new ImageID("Clue_1", register: true);

		public static readonly ImageID Clue_2 = new ImageID("Clue_2", register: true);

		public static readonly ImageID Clue_3 = new ImageID("Clue_3", register: true);

		public static readonly ImageID Clue_4 = new ImageID("Clue_4", register: true);

		public static readonly ImageID Scav_Outpost = new ImageID("Scav_Outpost", register: true);

		public static readonly ImageID Scav_And_Pearls = new ImageID("Scav_And_Pearls", register: true);

		public static readonly ImageID Scav_Slugcat_Trade = new ImageID("Scav_Slugcat_Trade", register: true);

		public static readonly ImageID Swarmers = new ImageID("Swarmers", register: true);

		public static readonly ImageID Moon_And_Swarmers = new ImageID("Moon_And_Swarmers", register: true);

		public static readonly ImageID Dead_Slugcat_A = new ImageID("Dead_Slugcat_A", register: true);

		public static readonly ImageID Dead_Slugcat_B = new ImageID("Dead_Slugcat_B", register: true);

		public static readonly ImageID Moon_Fantasy = new ImageID("Moon_Fantasy", register: true);

		public static readonly ImageID Slugcat_Eating = new ImageID("Slugcat_Eating", register: true);

		public static readonly ImageID Slugcat_Sleeping = new ImageID("Slugcat_Sleeping", register: true);

		public static readonly ImageID Undefined = new ImageID("Undefined", register: true);

		public ImageID(string value, bool register = false)
			: base(value, register)
		{
		}
	}

	public class HoloImage : HologramPart
	{
		public int lastImg;

		public IntVector2 lastShowImg;

		public Vector2 panPos;

		public Vector2 lastPanPos;

		public Vector2 panVel;

		public Vector2 panCenter;

		public float myAlpha;

		public float lastMyAlpha;

		public int randomImage;

		public float randomImageTime;

		public float randomFlicker = 1f;

		private bool showRandomFlickerImage;

		public IOwnAHoloImage imageOwner;

		public PositionedSoundEmitter sound;

		public bool isAdvertisement;

		public HoloImage(OverseerHologram hologram, int firstSprite, IOwnAHoloImage imageOwner)
			: base(hologram, firstSprite)
		{
			this.imageOwner = imageOwner;
			totalSprites = 2;
			LoadFile("RND_PROJ");
			LoadFile("STR_PROJ");
			if (ModManager.MSC)
			{
				LoadFile("ADS_PROJ");
				LoadFile("MOONAI_PROJ");
				LoadFile("MOONAI_PROJ-SAINT");
			}
			randomImage = Random.Range(0, 25);
		}

		public override void Update()
		{
			base.Update();
			if (sound == null)
			{
				sound = new PositionedSoundEmitter(hologram.pos, 0f, 1f);
				hologram.room.PlaySound(SoundID.Overseer_Image_LOOP, sound, loop: true, 0f, 1f, randomStartPosition: false);
				sound.requireActiveUpkeep = true;
			}
			else
			{
				sound.alive = true;
				sound.pos = hologram.pos;
				sound.volume = Mathf.Pow(partFade * hologram.fade, 0.25f) * myAlpha;
				if (sound.slatedForDeletetion && !sound.soundStillPlaying)
				{
					sound = null;
				}
			}
			bool flag = false;
			if (imageOwner.CurrImageIndex != lastImg)
			{
				randomFlicker = Mathf.Lerp(randomFlicker, 1f, Random.value * 0.2f);
				lastImg = imageOwner.CurrImageIndex;
				flag = true;
			}
			IntVector2 intVector = new IntVector2(showRandomFlickerImage ? randomImage : imageOwner.CurrImage.Index, (!showRandomFlickerImage) ? 1 : 0);
			if (intVector.x < 0)
			{
				intVector.x = 0;
			}
			if (intVector != lastShowImg && hologram.fade * partFade * myAlpha > 0.2f)
			{
				hologram.room.PlaySound(flag ? SoundID.Overseer_Image_Big_Flicker : SoundID.Overseer_Image_Small_Flicker, hologram.pos, hologram.fade * partFade * myAlpha, 1f, hologram.overseer.abstractCreature);
			}
			lastShowImg = intVector;
			lastPanPos = panPos;
			panPos += panVel;
			panPos = Vector2.Lerp(Vector2.ClampMagnitude(panPos, 1f), panCenter, 0.05f);
			if (ModManager.MSC && isAdvertisement)
			{
				panPos = panCenter;
			}
			panVel *= 0.8f;
			panVel += Custom.RNV() * (0.1f * Random.value * Random.value * Random.value * Random.value);
			panVel += (panCenter - panPos) * 0.01f;
			lastMyAlpha = myAlpha;
			float num = Mathf.InverseLerp(0.5f, 1f, partFade * hologram.fade);
			myAlpha = Mathf.Min(num, Custom.LerpAndTick(myAlpha, num, 0.01f, 1f / 120f));
			myAlpha = Mathf.Lerp(myAlpha, num, imageOwner.ImmediatelyToContent * 0.5f);
			num = Mathf.InverseLerp(1f, 0.5f, myAlpha);
			randomFlicker = Custom.LerpAndTick(randomFlicker, num, 0f, 1f / Custom.LerpMap(imageOwner.ShowTime, 20f, 300f, 10f, (num < randomFlicker) ? Mathf.Lerp(20f, 200f, randomFlicker) : 80f));
			if (ModManager.MSC && isAdvertisement)
			{
				randomFlicker *= 0.2f;
			}
			else
			{
				randomFlicker *= Mathf.Lerp(1f, 0.2f, imageOwner.ImmediatelyToContent);
			}
			if (hologram.overseer.AI.communication != null && myAlpha > 0.9f && randomFlicker < 0.1f)
			{
				hologram.overseer.AI.communication.showedImageTime++;
			}
			bool flag2 = showRandomFlickerImage;
			randomImageTime += 1f / Mathf.Lerp(15f, 1f, Mathf.Pow(randomFlicker, 0.5f));
			if (randomImageTime >= 1f)
			{
				showRandomFlickerImage = Random.value < randomFlicker;
				int num2 = randomImage;
				randomImage = Random.Range(0, 25);
				randomImageTime = 0f;
				if (showRandomFlickerImage && (!ModManager.MSC || !isAdvertisement))
				{
					panCenter = Custom.RNV() * (0.8f * Random.value);
				}
				else
				{
					panCenter *= 0f;
				}
				if (flag2 != showRandomFlickerImage || (showRandomFlickerImage && num2 != randomImage))
				{
					panPos = panCenter;
					lastPanPos = panCenter;
				}
			}
		}

		public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
			base.InitiateSprites(sLeaser, rCam);
			sLeaser.sprites[firstSprite] = new FSprite("RND_PROJ");
			sLeaser.sprites[firstSprite + 1] = new FSprite("Futile_White");
		}

		public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
		{
			base.DrawSprites(sLeaser, rCam, timeStacker, camPos, partPos, headPos, useFade, popOut, useColor);
			if (useFade == 0f)
			{
				sLeaser.sprites[firstSprite].isVisible = false;
				sLeaser.sprites[firstSprite + 1].isVisible = false;
				return;
			}
			sLeaser.sprites[firstSprite].isVisible = true;
			sLeaser.sprites[firstSprite + 1].isVisible = true;
			partPos = Vector3.Lerp(headPos, partPos, popOut);
			sLeaser.sprites[firstSprite].x = partPos.x - camPos.x;
			sLeaser.sprites[firstSprite].y = partPos.y - camPos.y;
			sLeaser.sprites[firstSprite].shader = rCam.game.rainWorld.Shaders["HologramImage"];
			int num = -1;
			if (ModManager.MSC)
			{
				if (imageOwner != null && hologram != null && hologram.room != null)
				{
					num = (showRandomFlickerImage ? randomImage : imageOwner.CurrImage.Index);
					if (isAdvertisement)
					{
						if (hologram.room.abstractRoom.name == "SL_AI" || hologram.room.abstractRoom.name == "RM_AI")
						{
							if (hologram.room.game.IsStorySession && SlugcatStats.AtOrAfterTimeline(hologram.room.game.TimelinePoint, SlugcatStats.Timeline.Saint))
							{
								sLeaser.sprites[firstSprite].element = Futile.atlasManager.GetElementWithName("MOONAI_PROJ-SAINT");
							}
							else
							{
								sLeaser.sprites[firstSprite].element = Futile.atlasManager.GetElementWithName("MOONAI_PROJ");
							}
							if (hologram.room.abstractRoom.name == "SL_AI" && num == 16)
							{
								num = 1;
							}
							if (hologram.room.abstractRoom.name == "RM_AI" && (num < 5 || num > 9) && num != 16)
							{
								num = (randomImage = ((!((double)Random.value < 0.25)) ? Random.Range(5, 10) : 16));
								if (imageOwner is OverseerImage)
								{
									(imageOwner as OverseerImage).images.Clear();
									(imageOwner as OverseerImage).images.Add(new ImageID(ExtEnum<ImageID>.values.GetEntry(num)));
								}
							}
						}
						else
						{
							sLeaser.sprites[firstSprite].element = Futile.atlasManager.GetElementWithName("ADS_PROJ");
						}
					}
					else
					{
						sLeaser.sprites[firstSprite].element = Futile.atlasManager.GetElementWithName(showRandomFlickerImage ? "RND_PROJ" : "STR_PROJ");
					}
				}
			}
			else
			{
				sLeaser.sprites[firstSprite].element = Futile.atlasManager.GetElementWithName(showRandomFlickerImage ? "RND_PROJ" : "STR_PROJ");
				if (imageOwner != null)
				{
					num = (showRandomFlickerImage ? randomImage : imageOwner.CurrImage.Index);
				}
			}
			sLeaser.sprites[firstSprite].rotation = 0f;
			sLeaser.sprites[firstSprite].scaleY = 0.1f * Mathf.Lerp(0.5f, 1f, useFade);
			sLeaser.sprites[firstSprite].scaleX = 0.1f * Mathf.Lerp(0.5f, 1f, useFade);
			if (num >= 0)
			{
				sLeaser.sprites[firstSprite].color = new Color(0.5f + 0.5f * Mathf.Lerp(lastPanPos.x, panPos.x, timeStacker), 0.5f + 0.5f * Mathf.Lerp(lastPanPos.y, panPos.y, timeStacker), (float)num / 25f);
			}
			float num2 = Custom.SCurve(Mathf.Pow(useFade, 2f) * Mathf.Lerp(lastMyAlpha, myAlpha, timeStacker), 0.4f);
			sLeaser.sprites[firstSprite].alpha = num2;
			sLeaser.sprites[firstSprite + 1].shader = rCam.game.rainWorld.Shaders["FlatLight"];
			sLeaser.sprites[firstSprite + 1].x = partPos.x - camPos.x;
			sLeaser.sprites[firstSprite + 1].y = partPos.y - camPos.y;
			num2 = Mathf.Lerp(Mathf.Min(num2, partFade), num2, 0.5f);
			sLeaser.sprites[firstSprite + 1].scale = 15f * Mathf.Lerp(0.5f, 1f, num2);
			sLeaser.sprites[firstSprite + 1].alpha = num2 * 0.5f;
			sLeaser.sprites[firstSprite + 1].color = useColor;
		}

		public void LoadFile(string fileName)
		{
			if (Futile.atlasManager.GetAtlasWithName(fileName) == null)
			{
				string text = AssetManager.ResolveFilePath("Projections" + Path.DirectorySeparatorChar + fileName + ".png");
				Texture2D texture2D = new Texture2D(1, 1, TextureFormat.ARGB32, mipChain: false);
				AssetManager.SafeWWWLoadTexture(ref texture2D, "file:///" + text, clampWrapMode: true, crispPixels: true);
				Futile.atlasManager.LoadAtlasFromTexture(fileName, texture2D, textureFromAsset: false);
			}
		}
	}

	public class Frame : HologramPart
	{
		public Frame(OverseerHologram hologram, int firstSprite)
			: base(hologram, firstSprite)
		{
			float num = 50f;
			for (int i = 0; i < 8; i++)
			{
				float num2 = ((float)i + 0.5f) / 8f;
				float num3 = ((float)(i + 1) + 0.5f) / 8f;
				Add3DLine(Custom.DegToVec(num2 * 360f) * num, Custom.DegToVec(num3 * 360f) * num, 5f);
			}
		}
	}

	public List<ImageID> images;

	private PlacedObject showPos;

	public int counter;

	public int currImage;

	public int timeOnEachImage;

	public HoloImage holoImagePart;

	public int showTime;

	private bool loggedAsSeen;

	public bool isAdvertisement;

	public int adCounter;

	public int CurrImageIndex => currImage;

	public int ShowTime => showTime;

	public ImageID CurrImage => images[currImage];

	public float ImmediatelyToContent => 0f;

	public OverseerImage(Overseer overseer, Message message, Creature communicateWith, float importance)
		: base(overseer, message, communicateWith, importance)
	{
		for (int i = 0; i < overseer.room.roomSettings.placedObjects.Count; i++)
		{
			if (overseer.room.roomSettings.placedObjects[i].type == PlacedObject.Type.ProjectedImagePosition)
			{
				showPos = overseer.room.roomSettings.placedObjects[i];
				break;
			}
		}
		images = new List<ImageID>();
		if (overseer.AI.communication != null)
		{
			switch (overseer.room.abstractRoom.name)
			{
			case "GATE_SU_HI":
			case "GATE_SU_DS":
				if (ModManager.MMF && MMF.cfgExtraTutorials.Value && overseer.room.world.game.IsStorySession && !overseer.room.world.game.GetStorySession.saveState.deathPersistentSaveData.GateStandTutorial)
				{
					images.Add(ImageID.Slugcat_Eating);
					images.Add(ImageID.Slugcat_Sleeping);
					timeOnEachImage = 80;
					showTime = 900;
				}
				else if (overseer.room.abstractRoom.name == "GATE_SU_HI")
				{
					images.Add(ImageID.Slugcat_1);
					images.Add(ImageID.Slugcat_2);
					images.Add(ImageID.Slugcat_3);
					images.Add(ImageID.Slugcat_4);
					images.Add(ImageID.Slugcat_5);
					images.Add(ImageID.Slugcat_7);
					images.Add(ImageID.Slugcat_6);
					timeOnEachImage = 60;
					showTime = 900;
				}
				break;
			case "GATE_HI_GW":
				images.Add(ImageID.Moon_Full_Figure);
				images.Add(ImageID.Moon_Double_Size);
				images.Add(ImageID.Moon_Portrait);
				overseer.AI.communication.GuideState.guideSymbol = 1;
				timeOnEachImage = 40;
				showTime = 900;
				break;
			case "GATE_GW_SL":
			case "GATE_SH_SL":
			case "GATE_SL_VS":
				if (!(overseer.room.abstractRoom.name == "GATE_SL_VS") || ModManager.MSC)
				{
					images.Add(ImageID.Clue_1);
					images.Add(ImageID.Clue_1);
					images.Add(ImageID.Clue_1);
					images.Add(ImageID.Clue_1);
					images.Add(ImageID.Clue_1);
					images.Add(ImageID.Clue_2);
					images.Add(ImageID.Clue_3);
					images.Add(ImageID.Clue_4);
					images.Add(ImageID.Clue_4);
					images.Add(ImageID.Slugcat_3);
					images.Add(ImageID.Clue_4);
					images.Add(ImageID.Slugcat_5);
					images.Add(ImageID.Clue_4);
					images.Add(ImageID.Slugcat_6);
					images.Add(ImageID.Clue_4);
					timeOnEachImage = 30;
					showTime = 1400;
					overseer.AI.communication.GuideState.guideSymbol = 1;
				}
				break;
			case "SU_A22":
				images.Add(ImageID.Slugcat_1);
				showTime = 90;
				break;
			case "SU_A37":
				images.Add(ImageID.Slugcat_7);
				images.Add(ImageID.Slugcat_5);
				timeOnEachImage = 30;
				showTime = 120;
				break;
			case "SU_A33":
				images.Add(ImageID.Slugcat_2);
				images.Add(ImageID.Slugcat_5);
				timeOnEachImage = 20;
				showTime = 40;
				break;
			case "SU_A30":
				images.Add(ImageID.Slugcat_3);
				images.Add(ImageID.Slugcat_6);
				timeOnEachImage = 40;
				showTime = 60;
				break;
			case "SU_A12":
				images.Add(ImageID.Slugcat_4);
				showTime = 60;
				break;
			case "HI_A24":
				images.Add(ImageID.Slugcat_3);
				images.Add(ImageID.Moon_Full_Figure);
				timeOnEachImage = 30;
				showTime = 90;
				break;
			case "HI_D01":
				images.Add(ImageID.Moon_Full_Figure);
				images.Add(ImageID.Slugcat_5);
				timeOnEachImage = 40;
				showTime = 80;
				break;
			case "HI_A21":
				images.Add(ImageID.Slugcat_5);
				images.Add(ImageID.Slugcat_2);
				timeOnEachImage = 30;
				showTime = 80;
				break;
			case "SL_A08":
				images.Add(ImageID.Moon_Full_Figure);
				images.Add(ImageID.Moon_Double_Size);
				images.Add(ImageID.Clue_1);
				images.Add(ImageID.Clue_4);
				timeOnEachImage = 20;
				showTime = 120;
				break;
			case "SL_C11":
				images.Add(ImageID.Moon_Portrait);
				showTime = 10;
				break;
			case "SL_A03":
				images.Add(ImageID.Moon_Full_Figure);
				images.Add(ImageID.Clue_4);
				timeOnEachImage = 20;
				showTime = 40;
				break;
			case "SL_C09":
				images.Add(ImageID.Moon_Full_Figure);
				showTime = 20;
				break;
			case "SL_I01":
				images.Add(ImageID.Moon_Full_Figure);
				images.Add(ImageID.Moon_Double_Size);
				images.Add(ImageID.Moon_Portrait);
				images.Add(ImageID.Clue_4);
				images.Add(ImageID.Moon_Portrait);
				images.Add(ImageID.Clue_4);
				images.Add(ImageID.Moon_Portrait);
				timeOnEachImage = 15;
				showTime = 110;
				break;
			case "SL_A15":
				images.Add(ImageID.Swarmers);
				images.Add(ImageID.Moon_And_Swarmers);
				images.Add(ImageID.Swarmers);
				images.Add(ImageID.Moon_And_Swarmers);
				images.Add(ImageID.Clue_2);
				timeOnEachImage = 40;
				showTime = 320;
				overseer.AI.communication.GuideState.guideSymbol = 2;
				break;
			case "SL_AI":
				if (ModManager.MMF && MMF.cfgExtraTutorials.Value)
				{
					images.Add(ImageID.Swarmers);
					images.Add(ImageID.Moon_And_Swarmers);
					images.Add(ImageID.Moon_Fantasy);
					images.Add(ImageID.Swarmers);
					images.Add(ImageID.Moon_And_Swarmers);
					images.Add(ImageID.Moon_Fantasy);
					images.Add(ImageID.Swarmers);
					images.Add(ImageID.Moon_And_Swarmers);
					images.Add(ImageID.Moon_Fantasy);
					timeOnEachImage = 80;
					showTime = 1400;
				}
				break;
			case "SH_C13":
				timeOnEachImage = 25;
				images.Add(ImageID.Scav_And_Pearls);
				images.Add(ImageID.Scav_Slugcat_Trade);
				showTime = 150;
				break;
			default:
				images.Add(ImageID.Moon_Double_Size);
				break;
			}
			if (overseer.AI.communication.GuideState.guideSymbol == 0)
			{
				for (int j = 0; j < images.Count; j++)
				{
					if (images[j] == ImageID.Moon_And_Swarmers || images[j] == ImageID.Moon_Double_Size || images[j] == ImageID.Moon_Full_Figure || images[j] == ImageID.Moon_Portrait)
					{
						overseer.AI.communication.GuideState.guideSymbol = 1;
						break;
					}
				}
			}
		}
		holoImagePart = new HoloImage(this, totalSprites, this);
		AddPart(holoImagePart);
		AddPart(new Frame(this, totalSprites));
	}

	public override void Update(bool eu)
	{
		base.Update(eu);
		if (holoImagePart.randomFlicker > 0.5f)
		{
			currImage = 0;
		}
		if (images.Count > 0)
		{
			if (holoImagePart.randomFlicker < 0.2f)
			{
				counter++;
			}
			if (counter > timeOnEachImage)
			{
				counter = 0;
				currImage++;
				if (currImage >= images.Count)
				{
					currImage = 0;
				}
			}
		}
		if (ModManager.MSC && isAdvertisement)
		{
			adCounter++;
			if (adCounter > showTime)
			{
				stillRelevant = false;
			}
		}
		if (overseer.AI.communication == null || (ModManager.MMF && !MMF.cfgExtraTutorials.Value && !(overseer.room.abstractRoom.name != "SL_AI")))
		{
			return;
		}
		if (!loggedAsSeen && overseer.AI.communication.showedImageTime > showTime / 3 && !isAdvertisement)
		{
			Custom.Log("image logged as seen", overseer.room.abstractRoom.name);
			if (overseer.AI.communication.GuideState.guideSymbol == 1 && (overseer.room.game.session as StoryGameSession).saveState.dreamsState != null)
			{
				(overseer.room.game.session as StoryGameSession).saveState.dreamsState.guideHasShownMoonThisRound = true;
			}
			overseer.AI.communication.GuideState.ImageShownInRoom(overseer.room.abstractRoom.name);
			loggedAsSeen = true;
		}
		if (overseer.AI.communication.showedImageTime > showTime)
		{
			stillRelevant = false;
		}
		if (room.regionGate == null || !(room.regionGate.mode != RegionGate.Mode.MiddleClosed) || isAdvertisement)
		{
			return;
		}
		Custom.Log("discontinue and log image b/c gate movement");
		stillRelevant = false;
		if (!loggedAsSeen)
		{
			overseer.AI.communication.GuideState.ImageShownInRoom(overseer.room.abstractRoom.name);
			if (overseer.AI.communication.GuideState.guideSymbol == 1 && (overseer.room.game.session as StoryGameSession).saveState.dreamsState != null)
			{
				(overseer.room.game.session as StoryGameSession).saveState.dreamsState.guideHasShownMoonThisRound = true;
			}
			loggedAsSeen = true;
		}
	}

	public override float DisplayPosScore(IntVector2 testPos)
	{
		if (room.abstractRoom.gate)
		{
			return Vector2.Distance(b: new Vector2(726f, 250f), a: room.MiddleOfTile(testPos));
		}
		if (showPos != null)
		{
			return Vector2.Distance(room.MiddleOfTile(testPos), showPos.pos);
		}
		return base.DisplayPosScore(testPos);
	}

	public void setAdvertisement()
	{
		isAdvertisement = true;
		holoImagePart.isAdvertisement = true;
		images.Clear();
		images.Add(new ImageID(ExtEnum<ImageID>.values.GetEntry(Random.Range(0, 25))));
		showTime = (timeOnEachImage = Random.Range(400, 1200));
		currImage = 0;
		counter = 0;
	}
}
