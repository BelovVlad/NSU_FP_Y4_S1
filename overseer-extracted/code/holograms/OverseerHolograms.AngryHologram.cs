using RWCustom;
using UnityEngine;

namespace OverseerHolograms;

public class AngryHologram : OverseerHologram, IOwnAHoloImage
{
	public OverseerTutorialBehavior.InputInstruction.RedCross redCross;

	public OverseerImage.HoloImage image;

	public OverseerImage.Frame frame;

	public int counter;

	public int showTime;

	public override Vector2 lookAt
	{
		get
		{
			if (communicateWith == null)
			{
				return overseer.firstChunk.pos;
			}
			return communicateWith.DangerPos;
		}
	}

	public int CurrImageIndex => 0;

	public int ShowTime => 0;

	public OverseerImage.ImageID CurrImage
	{
		get
		{
			if (counter % 60 >= 30)
			{
				return OverseerImage.ImageID.Dead_Slugcat_B;
			}
			return OverseerImage.ImageID.Dead_Slugcat_A;
		}
	}

	public float ImmediatelyToContent => 1f;

	public AngryHologram(Overseer overseer, Message message, Creature communicateWith, float importance)
		: base(overseer, message, communicateWith, importance)
	{
		redCross = new OverseerTutorialBehavior.InputInstruction.RedCross(this, totalSprites, small: false);
		AddPart(redCross);
		image = new OverseerImage.HoloImage(this, totalSprites, this);
		AddPart(image);
		frame = new OverseerImage.Frame(this, totalSprites);
		AddPart(frame);
	}

	public override void Update(bool eu)
	{
		base.Update(eu);
		counter++;
		redCross.visible = counter % 40 < 20;
		(overseer.abstractCreature.abstractAI as OverseerAbstractAI).goToPlayer = true;
		if (communicateWith != null)
		{
			redCross.offset = Vector2.Lerp(redCross.offset, communicateWith.DangerPos - pos, 0.23f) * 0.99f;
		}
		showTime++;
		if (image.myAlpha > 0.9f && image.randomFlicker < 0.1f)
		{
			showTime++;
		}
		if (showTime <= 800)
		{
			return;
		}
		stillRelevant = false;
		if (overseer.AI.communication != null)
		{
			if (!overseer.AI.communication.GuideState.displayedAnger)
			{
				overseer.AI.communication.GuideState.InfluenceLike(-2f, overseer.AI.creature.world.game.devToolsActive);
			}
			overseer.AI.communication.GuideState.displayedAnger = true;
		}
		(overseer.abstractCreature.abstractAI as OverseerAbstractAI).PlayerGuideGoAway(2000);
		(overseer.abstractCreature.abstractAI as OverseerAbstractAI).SetDestinationNoPathing(new WorldCoordinate(room.world.offScreenDen.index, -1, -1, 0), migrate: true);
	}

	public override float InfluenceHoverScoreOfTile(IntVector2 testPos, float f)
	{
		if (communicateWith == null)
		{
			return f;
		}
		f += Vector2.Distance(room.MiddleOfTile(testPos), communicateWith.DangerPos) * Mathf.Lerp(0.1f, 1.9f, Random.value);
		return f;
	}

	public override float DisplayPosScore(IntVector2 testPos)
	{
		if (communicateWith != null)
		{
			return Vector2.Distance(room.MiddleOfTile(testPos), communicateWith.DangerPos);
		}
		return Random.value;
	}
}
