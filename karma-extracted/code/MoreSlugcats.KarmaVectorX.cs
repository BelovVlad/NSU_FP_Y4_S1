using System;
using RWCustom;
using UnityEngine;

namespace MoreSlugcats;

public class KarmaVectorX : CosmeticSprite
{
	public float diameter;

	public float thiccness;

	public float alpha;

	public Vector2[,] segments;

	public Color color;

	public string container;

	public KarmaVectorX(Vector2 position, float diameter, float thiccness, float alpha)
	{
		pos = position;
		this.alpha = alpha;
		color = new Color(1f, 1f, 1f);
		this.diameter = diameter;
		this.thiccness = thiccness;
		container = "Midground";
		segments = new Vector2[16, 3];
	}

	public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
	{
		sLeaser.sprites = new FSprite[3];
		for (int i = 1; i < sLeaser.sprites.Length; i++)
		{
			sLeaser.sprites[i] = new FSprite("Futile_White");
			sLeaser.sprites[i].alpha = alpha;
		}
		sLeaser.sprites[0] = TriangleMesh.MakeLongMesh(segments.GetLength(0), pointyTip: false, customColor: true);
		sLeaser.sprites[1].scaleX = thiccness / sLeaser.sprites[1].width;
		sLeaser.sprites[1].scaleY = diameter / sLeaser.sprites[1].height;
		sLeaser.sprites[1].rotation = 45f;
		sLeaser.sprites[2].scaleX = thiccness / sLeaser.sprites[2].width;
		sLeaser.sprites[2].scaleY = diameter / sLeaser.sprites[2].height;
		sLeaser.sprites[2].rotation = -45f;
		UpdateMesh(sLeaser, 0f, rCam.pos);
		AddToContainer(sLeaser, rCam, rCam.ReturnFContainer(container));
	}

	public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
	{
		for (int i = 1; i < sLeaser.sprites.Length; i++)
		{
			sLeaser.sprites[i].x = pos.x - camPos.x;
			sLeaser.sprites[i].y = pos.y - camPos.y;
			sLeaser.sprites[i].alpha = alpha;
		}
		UpdateMesh(sLeaser, timeStacker, camPos);
		Color color = new Color(this.color.r, this.color.g, this.color.b, alpha);
		for (int j = 0; j < (sLeaser.sprites[0] as TriangleMesh).verticeColors.Length; j++)
		{
			(sLeaser.sprites[0] as TriangleMesh).verticeColors[j] = color;
		}
		sLeaser.sprites[1].scaleX = thiccness / sLeaser.sprites[1].element.sourceRect.width;
		sLeaser.sprites[1].scaleY = diameter / sLeaser.sprites[1].element.sourceRect.height;
		sLeaser.sprites[1].color = color;
		sLeaser.sprites[1].alpha = alpha;
		sLeaser.sprites[2].scaleX = thiccness / sLeaser.sprites[2].element.sourceRect.width;
		sLeaser.sprites[2].scaleY = diameter / sLeaser.sprites[2].element.sourceRect.height;
		sLeaser.sprites[2].color = color;
		sLeaser.sprites[2].alpha = alpha;
		base.DrawSprites(sLeaser, rCam, timeStacker, camPos);
	}

	public void UpdateMesh(RoomCamera.SpriteLeaser sLeaser, float timeStacker, Vector2 camPos)
	{
		Vector2 vector = Vector2.Lerp(segments[0, 1], segments[0, 0], timeStacker);
		float num = 4f;
		for (int i = 0; i < segments.GetLength(0); i++)
		{
			segments[i, 0] = pos;
			segments[i, 0].x += Mathf.Sin((float)Math.PI * 2f / ((float)segments.GetLength(0) - 1.35f) * (float)i) * diameter * 0.5f;
			segments[i, 0].y += Mathf.Cos((float)Math.PI * 2f / ((float)segments.GetLength(0) - 1.35f) * (float)i) * diameter * 0.5f;
			segments[i, 1] = segments[i, 0];
		}
		for (int j = 0; j < segments.GetLength(0); j++)
		{
			Vector2 vector2 = Vector2.Lerp(segments[j, 1], segments[j, 0], timeStacker);
			Vector2 normalized = (vector2 - vector).normalized;
			Vector2 vector3 = Custom.PerpendicularVector(normalized);
			float num2 = Vector2.Distance(vector2, vector) / 5f;
			float num3 = thiccness * 0.5f;
			Vector2 vector4 = vector3 * ((num + num3) * 0.5f);
			(sLeaser.sprites[0] as TriangleMesh).MoveVertice(j * 4, vector - vector4 + normalized * num2 - camPos);
			(sLeaser.sprites[0] as TriangleMesh).MoveVertice(j * 4 + 1, vector + vector4 + normalized * num2 - camPos);
			(sLeaser.sprites[0] as TriangleMesh).MoveVertice(j * 4 + 2, vector2 - vector3 * num3 - normalized * num2 - camPos);
			(sLeaser.sprites[0] as TriangleMesh).MoveVertice(j * 4 + 3, vector2 + vector3 * num3 - normalized * num2 - camPos);
			num = num3;
			vector = vector2;
		}
	}
}
