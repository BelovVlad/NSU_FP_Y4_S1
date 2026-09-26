using System;
using RWCustom;
using UnityEngine;

public class OverseerEffect : CosmeticSprite
{
	public float life;

	private float lastLife;

	public float lifeTime;

	public float rotation;

	public float lastRotation;

	public float rotVel;

	public float rad;

	private Color color;

	public OverseerEffect(Vector2 pos, Vector2 vel, Color color, float rad, float lifeTimeFac)
	{
		life = 1f;
		lastLife = 1f;
		lastPos = pos;
		base.vel = vel;
		this.color = color;
		base.pos = pos;
		this.rad = rad;
		rotation = UnityEngine.Random.value * 360f;
		lastRotation = rotation;
		rotVel = Mathf.Lerp(-26f, 26f, UnityEngine.Random.value);
		lifeTime = Mathf.Lerp(5f, 11f, UnityEngine.Random.value) * lifeTimeFac;
	}

	public override void Update(bool eu)
	{
		vel *= 0.9f;
		vel += Custom.RNV() * (UnityEngine.Random.value * 0.04f);
		lastRotation = rotation;
		rotation += rotVel * vel.magnitude;
		lastLife = life;
		life -= 1f / lifeTime;
		if (lastLife <= 0f)
		{
			Destroy();
		}
		base.Update(eu);
	}

	public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
	{
		sLeaser.sprites = new FSprite[1];
		sLeaser.sprites[0] = new FSprite("Futile_White");
		sLeaser.sprites[0].shader = rCam.room.game.rainWorld.Shaders["OverseerZip"];
		AddToContainer(sLeaser, rCam, rCam.ReturnFContainer("Foreground"));
	}

	public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
	{
		Vector2 vector = Vector2.Lerp(lastPos, pos, timeStacker);
		sLeaser.sprites[0].x = vector.x - camPos.x;
		sLeaser.sprites[0].y = vector.y - camPos.y;
		sLeaser.sprites[0].rotation = Mathf.Lerp(lastRotation, rotation, timeStacker);
		float num = Mathf.Lerp(lastLife, life, timeStacker);
		sLeaser.sprites[0].scale = rad * Mathf.Sin(num * (float)Math.PI) / 8f;
		sLeaser.sprites[0].alpha = 0.5f * Mathf.Pow(Mathf.Max(0f, Mathf.Lerp(lastLife, life, timeStacker)), 1.2f);
		base.DrawSprites(sLeaser, rCam, timeStacker, camPos);
	}

	public override void ApplyPalette(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, RoomPalette palette)
	{
		sLeaser.sprites[0].color = color;
	}

	public override void AddToContainer(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, FContainer newContatiner)
	{
		base.AddToContainer(sLeaser, rCam, newContatiner);
	}
}
