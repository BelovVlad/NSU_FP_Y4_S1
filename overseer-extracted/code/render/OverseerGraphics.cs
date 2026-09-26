using System;
using System.Collections.Generic;
using CoralBrain;
using RWCustom;
using UnityEngine;

public class OverseerGraphics : ComplexGraphicsModule, IOwnMycelia
{
	public class HologramMatrix : GraphicsSubModule
	{
		public class Line
		{
			public Vector3 A;

			public Vector3 B;

			public Vector3 altA;

			public Vector3 altB;

			public int rotation;

			public int movement;

			public Line(Vector3 A, Vector3 altA, Vector3 B, Vector3 altB, int rotation, int movement)
			{
				this.A = A;
				this.B = B;
				this.altA = altA;
				this.altB = altB;
				this.rotation = rotation;
				this.movement = movement;
			}
		}

		public List<Line> lines;

		private float xRotat;

		private float lastXRotat;

		private float yRotat;

		private float lastYRotat;

		private float zRotat;

		private float lastZRotat;

		private OverseerGraphics overseerGraphics;

		public float[,] rotations;

		public float[,] movements;

		public HologramMatrix(OverseerGraphics overseerGraphics, int firstSprite)
			: base(overseerGraphics, firstSprite)
		{
			this.overseerGraphics = overseerGraphics;
			lines = new List<Line>();
			GenerateShape();
			totalSprites = lines.Count;
			rotations = new float[2, 6];
			for (int i = 0; i < rotations.GetLength(0); i++)
			{
				rotations[i, 0] = UnityEngine.Random.value;
				rotations[i, 1] = rotations[i, 0];
				rotations[i, 4] = 1f;
			}
		}

		public override void Update()
		{
			if (overseerGraphics.holoLensUp == 0f && overseerGraphics.lastHoloLensUp == 0f)
			{
				return;
			}
			for (int i = 0; i < rotations.GetLength(0); i++)
			{
				rotations[i, 1] = rotations[i, 0];
				rotations[i, 0] = Mathf.Lerp(rotations[i, 2], rotations[i, 3], Custom.SCurve(rotations[i, 4], 0.5f));
				rotations[i, 4] = Mathf.Min(1f, rotations[i, 4] + rotations[i, 5]);
				if (UnityEngine.Random.value < 1f / ((i == 0) ? 40f : 70f) && rotations[i, 4] == 1f)
				{
					rotations[i, 4] = 0f;
					rotations[i, 2] = rotations[i, 0];
					rotations[i, 3] = rotations[i, 0] + Mathf.Pow(UnityEngine.Random.value, 3f) * 0.8f * ((UnityEngine.Random.value < 0.5f) ? (-1f) : 1f);
					rotations[i, 5] = 0.02f / Mathf.Abs(rotations[i, 2] - rotations[i, 3]);
				}
			}
			for (int j = 0; j < movements.GetLength(0); j++)
			{
				movements[j, 1] = movements[j, 0];
				movements[j, 0] = Mathf.Lerp(movements[j, 2], movements[j, 3], Custom.SCurve(movements[j, 4], 0.5f));
				movements[j, 4] = Mathf.Min(1f, movements[j, 4] + movements[j, 5]);
				if (UnityEngine.Random.value < 0.05f && movements[j, 4] == 1f)
				{
					movements[j, 4] = 0f;
					movements[j, 2] = movements[j, 0];
					switch (j)
					{
					case 0:
						movements[j, 3] = UnityEngine.Random.value;
						break;
					case 2:
						movements[j, 3] = ((UnityEngine.Random.value < 0.5f) ? 0f : 1f);
						break;
					default:
						movements[j, 3] = ((UnityEngine.Random.value < 0.5f) ? 0f : UnityEngine.Random.value);
						break;
					}
					movements[j, 5] = 0.02f / Mathf.Abs(movements[j, 2] - movements[j, 3]);
				}
			}
			if (UnityEngine.Random.value < 0.025f)
			{
				for (int k = 1; k < movements.GetLength(0); k++)
				{
					movements[k, 4] = 0f;
					movements[k, 2] = movements[k, 0];
					movements[k, 3] = 0f;
					movements[k, 5] = 0.02f / Mathf.Abs(movements[k, 2] - movements[k, 3]);
				}
			}
		}

		public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
			for (int i = 0; i < totalSprites; i++)
			{
				sLeaser.sprites[firstSprite + i] = new FSprite("pixel");
				sLeaser.sprites[firstSprite + i].color = new Color(1f, 0f, 0f);
				sLeaser.sprites[firstSprite + i].anchorY = 0f;
				sLeaser.sprites[firstSprite + i].shader = rCam.game.rainWorld.Shaders["Hologram"];
			}
		}

		public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
		{
			if (overseerGraphics.holoLensUp == 0f && overseerGraphics.lastHoloLensUp == 0f)
			{
				for (int i = firstSprite; i < firstSprite + totalSprites; i++)
				{
					sLeaser.sprites[i].isVisible = false;
				}
				return;
			}
			Vector2 usePos = overseerGraphics.usePos;
			float num = 1f - Mathf.Lerp(overseerGraphics.overseer.lastExtended, overseerGraphics.overseer.extended, timeStacker);
			usePos += (Vector2)overseerGraphics.useDir * (num * 30f);
			float num2 = Mathf.Max(num, 1f - Mathf.Lerp(overseerGraphics.lastHoloLensUp, overseerGraphics.holoLensUp, timeStacker));
			float urX = (0f - overseerGraphics.useDir.y) / ((float)Math.PI * 2f);
			float urY = overseerGraphics.useDir.x / ((float)Math.PI * 2f);
			Color color = Color.Lerp(overseerGraphics.MainColor, overseerGraphics.ColorOfSegment(0f, timeStacker), UnityEngine.Random.value);
			for (int j = 0; j < totalSprites; j++)
			{
				if (UnityEngine.Random.value < num2)
				{
					sLeaser.sprites[firstSprite + j].isVisible = false;
					continue;
				}
				sLeaser.sprites[firstSprite + j].isVisible = true;
				float num3 = Mathf.Lerp(movements[lines[j].movement, 1], movements[lines[j].movement, 0], timeStacker);
				if (lines[j].movement > 0)
				{
					num3 = Mathf.Lerp(Mathf.Lerp(movements[1, 1], movements[1, 0], timeStacker), num3, Mathf.Lerp(movements[2, 1], movements[2, 0], timeStacker));
				}
				Vector2 vector = usePos + OnPlanePos(Vector3.Slerp(lines[j].A, lines[j].altA, num3), urX, urY, Mathf.Lerp(rotations[lines[j].rotation, 1], rotations[lines[j].rotation, 0], timeStacker), num);
				Vector2 vector2 = usePos + OnPlanePos(Vector3.Slerp(lines[j].B, lines[j].altB, num3), urX, urY, Mathf.Lerp(rotations[lines[j].rotation, 1], rotations[lines[j].rotation, 0], timeStacker), num);
				if (UnityEngine.Random.value < 0.5f)
				{
					if (UnityEngine.Random.value < num2)
					{
						vector = usePos;
					}
					if (UnityEngine.Random.value < num2)
					{
						vector2 = usePos;
					}
				}
				sLeaser.sprites[firstSprite + j].x = vector.x - camPos.x;
				sLeaser.sprites[firstSprite + j].y = vector.y - camPos.y;
				sLeaser.sprites[firstSprite + j].rotation = Custom.AimFromOneVectorToAnother(vector, vector2);
				sLeaser.sprites[firstSprite + j].scaleY = Vector2.Distance(vector, vector2);
				sLeaser.sprites[firstSprite + j].color = color;
				sLeaser.sprites[firstSprite + j].alpha = 1f - num2;
			}
		}

		public Vector2 OnPlanePos(Vector3 position, float urX, float urY, float urZ, float fold)
		{
			position.x *= 1f - fold;
			position.y *= 1f - fold;
			position.z *= 1f + fold * 5f;
			float x = position.x * Mathf.Cos(urZ * (float)Math.PI * 2f) - position.y * Mathf.Sin(urZ * (float)Math.PI * 2f);
			position.y = position.x * Mathf.Sin(urZ * (float)Math.PI * 2f) + position.y * Mathf.Cos(urZ * (float)Math.PI * 2f);
			position.x = x;
			float y = position.y * Mathf.Cos(urX * (float)Math.PI * 2f) - position.z * Mathf.Sin(urX * (float)Math.PI * 2f);
			position.z = position.y * Mathf.Sin(urX * (float)Math.PI * 2f) + position.z * Mathf.Cos(urX * (float)Math.PI * 2f);
			position.y = y;
			float z = position.z * Mathf.Cos(urY * (float)Math.PI * 2f) - position.x * Mathf.Sin(urY * (float)Math.PI * 2f);
			position.x = position.z * Mathf.Sin(urY * (float)Math.PI * 2f) + position.x * Mathf.Cos(urY * (float)Math.PI * 2f);
			position.z = z;
			return new Vector2(position.x, position.y);
		}

		private void GenerateShape()
		{
			int num = UnityEngine.Random.Range(3, 7);
			if (UnityEngine.Random.value < 0.5f && overseerGraphics.mycelia.Length != 4 && overseerGraphics.mycelia.Length > 2)
			{
				num = overseerGraphics.mycelia.Length;
			}
			Vector3 vector = default(Vector3);
			Vector3 vector2 = default(Vector3);
			Vector3 vector3 = default(Vector3);
			Vector3 vector4 = default(Vector3);
			Vector3 vector5 = default(Vector3);
			float num2 = Mathf.Lerp(4f, 8f, Mathf.Pow(UnityEngine.Random.value, 0.5f));
			float num3 = Mathf.Lerp(12f, 20f, UnityEngine.Random.value);
			float num4 = Mathf.Min(num2, Mathf.Lerp(3f, 8f, UnityEngine.Random.value));
			float z = num3 + Mathf.Lerp(5f, 12f, UnityEngine.Random.value);
			float num5 = Mathf.Lerp(num2 * 0.5f, 4f, 0.5f + UnityEngine.Random.value * 0.5f);
			float num6 = Mathf.Lerp(12f, 20f, UnityEngine.Random.value);
			float num7 = Mathf.Lerp(num4 * 0.5f, 3f, 0.5f + UnityEngine.Random.value * 0.5f);
			float z2 = num6 + Mathf.Lerp(10f, 20f, Mathf.Pow(UnityEngine.Random.value, 0.5f));
			for (int i = 1; i < num + 1; i++)
			{
				Vector3 vector6 = Custom.DegToVec((float)i * 360f / (float)num);
				Vector3 vector7 = Custom.DegToVec((float)(i + 1) * 360f / (float)num);
				lines.Add(new Line(new Vector3(vector6.x * num2, vector6.y * num2, num3), new Vector3(vector6.x * num5, vector6.y * num5, num6), new Vector3(vector7.x * num2, vector7.y * num2, num3), new Vector3(vector7.x * num5, vector7.y * num5, num6), 0, 0));
				lines.Add(new Line(new Vector3(vector6.x * num4, vector6.y * num4, z), new Vector3(vector6.x * num7, vector6.y * num7, z2), new Vector3(vector7.x * num4, vector7.y * num4, z), new Vector3(vector7.x * num7, vector7.y * num7, z2), 0, 0));
				lines.Add(new Line(new Vector3(vector6.x * num2, vector6.y * num2, num3), new Vector3(vector6.x * num5, vector6.y * num5, num6), new Vector3(vector6.x * num4, vector6.y * num4, z), new Vector3(vector6.x * num7, vector6.y * num7, z2), 0, 0));
			}
			int num8 = UnityEngine.Random.Range(3, 9);
			if (num == 3)
			{
				num8 = 6;
			}
			if (UnityEngine.Random.value < 0.5f)
			{
				num8 = UnityEngine.Random.Range(3, UnityEngine.Random.Range(3, 9));
			}
			if (UnityEngine.Random.value < 0.5f)
			{
				num8 = num;
			}
			num3 = Mathf.Lerp(7f, 16f, UnityEngine.Random.value);
			float num9 = Mathf.Lerp(7f, 25f, UnityEngine.Random.value);
			float num10 = Mathf.Lerp(0.2f, 0.6f, Mathf.Pow(UnityEngine.Random.value, 1.5f));
			float num11 = num10 * Mathf.Lerp(1f, 0.25f, Mathf.Pow(UnityEngine.Random.value, 1.5f));
			float num12 = Mathf.Lerp(num2 + 2f, 11f, UnityEngine.Random.value);
			float num13 = Mathf.Lerp(num12 + 5f, 18f, Mathf.Pow(UnityEngine.Random.value, Custom.LerpMap(num8, 3f, 8f, 1f, 5f)));
			int num14 = UnityEngine.Random.Range(0, 5);
			if (UnityEngine.Random.value < 1f / 3f)
			{
				num14 = 2;
			}
			if (num14 == 0)
			{
				num13 = Mathf.Lerp(num13, 18f, UnityEngine.Random.value);
				num10 = Mathf.Lerp(num10, 0.6f, UnityEngine.Random.value);
			}
			float t = Mathf.Lerp(0.2f, 0.8f, Mathf.Pow(UnityEngine.Random.value, (num14 == 3) ? 0.5f : 1f));
			float num15 = Mathf.Lerp(num12, num13, t);
			float z3 = Mathf.Lerp(num3, num9, t) + Mathf.Pow(UnityEngine.Random.value, 3f) * ((UnityEngine.Random.value < 0.85f) ? 5f : 10f) * ((UnityEngine.Random.value < 0.85f) ? (-1f) : 1f);
			num6 = Mathf.Lerp(num3, Mathf.Lerp(7f, 16f, UnityEngine.Random.value), UnityEngine.Random.value);
			float num16 = Mathf.Lerp(num9 + Mathf.Lerp(11f, 20f, UnityEngine.Random.value) * ((UnityEngine.Random.value < 0.15f) ? (-1f) : 1f), Mathf.Lerp(11f, 35f, UnityEngine.Random.value), UnityEngine.Random.value);
			float num17 = Mathf.Lerp(0.2f, 0.6f, Mathf.Pow(UnityEngine.Random.value, 1.5f));
			float num18 = num17 * Mathf.Lerp(1f, 0.25f, Mathf.Pow(UnityEngine.Random.value, 1.5f));
			float num19 = Mathf.Lerp(num2, 16f, UnityEngine.Random.value);
			float num20 = Mathf.Lerp(num19 + 5f, 18f, Mathf.Pow(UnityEngine.Random.value, Custom.LerpMap(num8, 3f, 8f, 1f, 5f))) * Custom.LerpMap(Mathf.Abs(num16), 0f, 25f, 1.5f, 0.5f);
			float num21 = Mathf.Lerp(num19, num20, t);
			float z4 = Mathf.Lerp(num6, num16, t) + Mathf.Pow(UnityEngine.Random.value, 3f) * ((UnityEngine.Random.value < 0.85f) ? 5f : 10f) * ((UnityEngine.Random.value < 0.85f) ? (-1f) : 1f);
			for (int j = 0; j < num8; j++)
			{
				float num22 = (float)j / (float)num8 * 360f;
				switch (num14)
				{
				case 0:
				{
					Vector3 vector6 = Custom.DegToVec(num22 - 180f / (float)num8 * num10) * num12;
					vector6.z = num3;
					Vector3 vector7 = Custom.DegToVec(num22 + 180f / (float)num8 * num10) * num12;
					vector7.z = num3;
					Vector3 vector8 = Custom.DegToVec(num22) * num13;
					vector8.z = num9;
					vector = Custom.DegToVec(num22 - 180f / (float)num8 * num17) * num19;
					vector.z = num6;
					vector2 = Custom.DegToVec(num22 + 180f / (float)num8 * num17) * num19;
					vector2.z = num6;
					vector3 = Custom.DegToVec(num22) * num20;
					vector3.z = num16;
					lines.Add(new Line(vector6, vector, vector7, vector2, 1, 2 + j));
					lines.Add(new Line(vector7, vector2, vector8, vector3, 1, 2 + j));
					lines.Add(new Line(vector8, vector3, vector6, vector, 1, 2 + j));
					break;
				}
				case 1:
				{
					Vector3 vector6 = Custom.DegToVec(num22) * num12;
					vector6.z = num3;
					Vector3 vector7 = Custom.DegToVec(num22 - 180f / (float)num8 * num10) * num13;
					vector7.z = num9;
					Vector3 vector8 = Custom.DegToVec(num22 + 180f / (float)num8 * num10) * num13;
					vector8.z = num9;
					vector = Custom.DegToVec(num22) * num19;
					vector.z = num6;
					vector2 = Custom.DegToVec(num22 - 180f / (float)num8 * num17) * num20;
					vector2.z = num16;
					vector3 = Custom.DegToVec(num22 + 180f / (float)num8 * num17) * num20;
					vector3.z = num16;
					lines.Add(new Line(vector6, vector, vector7, vector2, 1, 2 + j));
					lines.Add(new Line(vector7, vector2, vector8, vector3, 1, 2 + j));
					lines.Add(new Line(vector8, vector3, vector6, vector, 1, 2 + j));
					break;
				}
				case 2:
				{
					Vector3 vector6 = Custom.DegToVec(num22 - 180f / (float)num8 * num10) * num12;
					vector6.z = num3;
					Vector3 vector7 = Custom.DegToVec(num22 - 180f / (float)num8 * num11) * num13;
					vector7.z = num9;
					Vector3 vector8 = Custom.DegToVec(num22 + 180f / (float)num8 * num11) * num13;
					vector8.z = num9;
					Vector3 vector9 = Custom.DegToVec(num22 + 180f / (float)num8 * num10) * num12;
					vector9.z = num3;
					vector = Custom.DegToVec(num22 - 180f / (float)num8 * num17) * num19;
					vector.z = num6;
					vector2 = Custom.DegToVec(num22 - 180f / (float)num8 * num18) * num20;
					vector2.z = num16;
					vector3 = Custom.DegToVec(num22 + 180f / (float)num8 * num18) * num20;
					vector3.z = num16;
					vector4 = Custom.DegToVec(num22 + 180f / (float)num8 * num17) * num19;
					vector4.z = num6;
					lines.Add(new Line(vector6, vector, vector7, vector2, 1, 2 + j));
					lines.Add(new Line(vector7, vector2, vector8, vector3, 1, 2 + j));
					lines.Add(new Line(vector8, vector3, vector9, vector4, 1, 2 + j));
					lines.Add(new Line(vector9, vector4, vector6, vector, 1, 2 + j));
					break;
				}
				case 3:
				{
					Vector3 vector6 = Custom.DegToVec(num22 - 180f / (float)num8 * num10) * num12;
					vector6.z = num3;
					Vector3 vector7 = Custom.DegToVec(num22 - 180f / (float)num8 * num11) * num15;
					vector7.z = z3;
					Vector3 vector8 = Custom.DegToVec(num22) * num13;
					vector8.z = num9;
					Vector3 vector9 = Custom.DegToVec(num22 + 180f / (float)num8 * num11) * num15;
					vector9.z = z3;
					Vector3 vector10 = Custom.DegToVec(num22 + 180f / (float)num8 * num10) * num12;
					vector10.z = num3;
					vector = Custom.DegToVec(num22 - 180f / (float)num8 * num17) * num19;
					vector.z = num6;
					vector2 = Custom.DegToVec(num22 - 180f / (float)num8 * num18) * num21;
					vector2.z = z4;
					vector3 = Custom.DegToVec(num22) * num20;
					vector3.z = num16;
					vector4 = Custom.DegToVec(num22 + 180f / (float)num8 * num18) * num21;
					vector4.z = z4;
					vector5 = Custom.DegToVec(num22 + 180f / (float)num8 * num17) * num19;
					vector5.z = num6;
					lines.Add(new Line(vector6, vector, vector7, vector2, 1, 2 + j));
					lines.Add(new Line(vector7, vector2, vector8, vector3, 1, 2 + j));
					lines.Add(new Line(vector8, vector3, vector9, vector4, 1, 2 + j));
					lines.Add(new Line(vector9, vector4, vector10, vector5, 1, 2 + j));
					lines.Add(new Line(vector10, vector5, vector6, vector, 1, 2 + j));
					break;
				}
				case 4:
				{
					Vector3 vector6 = Custom.DegToVec(num22) * num12;
					vector6.z = num3;
					Vector3 vector7 = Custom.DegToVec(num22 - 180f / (float)num8 * num10) * num15;
					vector7.z = z3;
					Vector3 vector8 = Custom.DegToVec(num22 - 180f / (float)num8 * num11) * num13;
					vector8.z = num9;
					Vector3 vector9 = Custom.DegToVec(num22 + 180f / (float)num8 * num11) * num13;
					vector9.z = num9;
					Vector3 vector10 = Custom.DegToVec(num22 + 180f / (float)num8 * num10) * num15;
					vector10.z = z3;
					vector = Custom.DegToVec(num22) * num19;
					vector.z = num6;
					vector2 = Custom.DegToVec(num22 - 180f / (float)num8 * num17) * num21;
					vector2.z = z4;
					vector3 = Custom.DegToVec(num22 - 180f / (float)num8 * num18) * num20;
					vector3.z = num16;
					vector4 = Custom.DegToVec(num22 + 180f / (float)num8 * num18) * num20;
					vector4.z = num16;
					vector5 = Custom.DegToVec(num22 + 180f / (float)num8 * num17) * num21;
					vector5.z = z4;
					lines.Add(new Line(vector6, vector, vector7, vector2, 1, 2 + j));
					lines.Add(new Line(vector7, vector2, vector8, vector3, 1, 2 + j));
					lines.Add(new Line(vector8, vector3, vector9, vector4, 1, 2 + j));
					lines.Add(new Line(vector9, vector4, vector10, vector5, 1, 2 + j));
					lines.Add(new Line(vector10, vector5, vector6, vector, 1, 2 + j));
					break;
				}
				}
			}
			float num23 = Mathf.Lerp(1f, overseerGraphics.overseer.size, UnityEngine.Random.value * 0.5f);
			for (int k = 0; k < lines.Count; k++)
			{
				lines[k].A *= num23;
				lines[k].altA *= num23;
				lines[k].B *= num23;
				lines[k].altB *= num23;
			}
			movements = new float[3 + num8, 6];
			for (int l = 0; l < movements.GetLength(0); l++)
			{
				movements[l, 0] = UnityEngine.Random.value;
				movements[l, 1] = movements[l, 0];
				movements[l, 4] = 1f;
			}
		}
	}

	public class SafariCursor : GraphicsSubModule
	{
		private OverseerGraphics overseerGraphics;

		private float lastQuality;

		private float quality;

		private int counter;

		private float mobile;

		private float lastMobile;

		private Vector2 lastPushAroundPos;

		private Vector2 pushAroundPos;

		private Vector2 targetCursorPos;

		private Vector2 lastTargetCursorPos;

		private float rotationOffset;

		public float[] rotations;

		public bool OverseerActive => overseerGraphics.overseer.mode != Overseer.Mode.Zipping;

		public bool TargetVisible
		{
			get
			{
				if (overseerGraphics.overseer.abstractCreature.abstractAI == null)
				{
					return false;
				}
				OverseerAbstractAI overseerAbstractAI = overseerGraphics.overseer.abstractCreature.abstractAI as OverseerAbstractAI;
				if (overseerAbstractAI.doorSelectionIndex == -1)
				{
					if (overseerAbstractAI.targetCreature != null && overseerAbstractAI.targetCreature != overseerAbstractAI.parent && !overseerAbstractAI.targetCreature.InDen && overseerAbstractAI.targetCreature.Room == overseerAbstractAI.parent.Room && overseerAbstractAI.targetCreature.realizedCreature != null && overseerAbstractAI.targetCreature.realizedCreature.room != null)
					{
						return !overseerAbstractAI.targetCreature.realizedCreature.inShortcut;
					}
					return false;
				}
				return true;
			}
		}

		public float TargetAnimProgress
		{
			get
			{
				if (overseerGraphics.overseer.abstractCreature.abstractAI == null)
				{
					return 0f;
				}
				return Mathf.Min(Mathf.Max((overseerGraphics.overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreatureTime - 15, 0f) / 40f, 1f);
			}
		}

		public SafariCursor(OverseerGraphics overseerGraphics, int firstSprite)
			: base(overseerGraphics, firstSprite)
		{
			this.overseerGraphics = overseerGraphics;
			targetCursorPos = Vector2.zero;
			lastTargetCursorPos = targetCursorPos;
			totalSprites = 10;
			rotations = new float[5];
			rotations[0] = 1f;
		}

		public Vector2 OverseerEyePos(float timeStacker)
		{
			if (overseerGraphics.overseer.room == null)
			{
				return Vector2.Lerp(overseerGraphics.overseer.mainBodyChunk.lastPos, overseerGraphics.overseer.mainBodyChunk.pos, timeStacker);
			}
			return overseerGraphics.DrawPosOfSegment(0f, timeStacker);
		}

		public float GetRotation(float timeStacker)
		{
			return Mathf.Lerp(rotations[2], rotations[3], Custom.SCurve(Mathf.Lerp(rotations[1], rotations[0], timeStacker), 0.65f)) + rotationOffset;
		}

		public override void Update()
		{
			if (!TargetVisible)
			{
				return;
			}
			counter++;
			lastTargetCursorPos = targetCursorPos;
			Creature realizedCreature = (overseerGraphics.overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature.realizedCreature;
			if ((overseerGraphics.overseer.abstractCreature.abstractAI as OverseerAbstractAI).doorSelectionIndex == -1)
			{
				if (realizedCreature != null)
				{
					targetCursorPos = realizedCreature.firstChunk.pos;
				}
			}
			else
			{
				ShortcutData shortcutData = overseerGraphics.OwnerRoom.ShortcutLeadingToNode((overseerGraphics.overseer.abstractCreature.abstractAI as OverseerAbstractAI).doorSelectionIndex);
				targetCursorPos = overseerGraphics.OwnerRoom.MiddleOfTile(shortcutData.startCoord);
			}
			lastPushAroundPos = pushAroundPos;
			lastQuality = quality;
			lastMobile = mobile;
			pushAroundPos *= 0.8f;
			if (OverseerActive && overseerGraphics.overseer.extended > 0f)
			{
				pushAroundPos += (overseerGraphics.overseer.firstChunk.pos - overseerGraphics.overseer.firstChunk.lastPos) * overseerGraphics.overseer.extended;
			}
			if (OverseerActive)
			{
				quality = Mathf.Min(1f, quality + 0.05f);
			}
			else
			{
				quality = Mathf.Max(0f, quality - 1f / Mathf.Lerp(30f, 80f, quality));
			}
			if (UnityEngine.Random.value < 0.1f)
			{
				quality = Mathf.Min(quality, Mathf.InverseLerp(600f, 400f, Vector2.Distance(OverseerEyePos(1f), targetCursorPos)));
			}
			rotations[1] = rotations[0];
			rotations[0] = Mathf.Min(1f, rotations[0] + rotations[4]);
			if (realizedCreature.abstractCreature.controlled)
			{
				rotationOffset = Mathf.Lerp(rotationOffset, 0.125f, 0.1f);
			}
			else
			{
				rotationOffset = Mathf.Lerp(rotationOffset, 0f, 0.1f);
			}
		}

		public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
			for (int i = 0; i < 8; i++)
			{
				sLeaser.sprites[firstSprite + i] = new FSprite("pixel");
				sLeaser.sprites[firstSprite + i].scaleX = 2f;
				sLeaser.sprites[firstSprite + i].scaleY = 15f;
				sLeaser.sprites[firstSprite + i].anchorY = 0f;
				sLeaser.sprites[firstSprite + i].shader = rCam.game.rainWorld.Shaders["Hologram"];
			}
			sLeaser.sprites[firstSprite + 8] = new FSprite("Futile_White");
			sLeaser.sprites[firstSprite + 8].shader = rCam.game.rainWorld.Shaders["FlatLight"];
			sLeaser.sprites[firstSprite + 8].scale = 2f;
			sLeaser.sprites[firstSprite + 9] = new FSprite("pixel");
			sLeaser.sprites[firstSprite + 9].scale = 5f;
		}

		public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
		{
			float num = rotationOffset / 0.125f;
			bool flag = num > 0.1f;
			if (overseerGraphics.overseer.abstractCreature.abstractAI != null)
			{
				_ = (overseerGraphics.overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature;
			}
			Vector2 vector = OverseerEyePos(timeStacker);
			Vector2 vector2 = Vector2.Lerp(lastPushAroundPos, pushAroundPos, timeStacker);
			float num2 = Mathf.Pow(1f - Mathf.Lerp(lastQuality, quality, timeStacker), 1.5f);
			Vector2 vector3 = Vector2.Lerp(lastTargetCursorPos, targetCursorPos, timeStacker) + vector2 * Mathf.Lerp(0.5f, 1f, num2);
			Mathf.Lerp(0.5f + 0.5f * Mathf.Sin(((float)counter + timeStacker) / 8f), UnityEngine.Random.value, num2 * 0.2f);
			Mathf.Lerp(lastMobile, mobile, timeStacker);
			float num3 = GetRotation(timeStacker) * 360f;
			Color white = Color.white;
			float num4 = Vector2.Distance(vector, vector3);
			for (int i = 0; i < 8; i++)
			{
				float num5 = Mathf.InverseLerp(0f, 4f, i / 2) * 360f + num3;
				Vector2 vector4 = vector3 + Custom.DegToVec(num5) * Mathf.Lerp(35f, 70f, TargetAnimProgress);
				Vector2 vector5 = vector3 + Vector2.Lerp(Custom.DegToVec(num5) * Mathf.Lerp(20f, 55f, TargetAnimProgress), Custom.DegToVec(num5) * Mathf.Lerp(35f, 70f, TargetAnimProgress) - Custom.DegToVec(num5 + ((i % 2 != 0) ? 1f : (-1f)) * 45f) * 10f, 0.25f);
				vector4 += pushAroundPos * (0.5f * Mathf.Pow(Mathf.InverseLerp(num4 + 40f, num4 - 40f, Vector2.Distance(vector, vector4)), 2f) + 0.5f * UnityEngine.Random.value * num2);
				vector5 += pushAroundPos * (0.5f * Mathf.Pow(Mathf.InverseLerp(num4 + 40f, num4 - 40f, Vector2.Distance(vector, vector5)), 2f) + 0.5f * UnityEngine.Random.value * num2);
				if (UnityEngine.Random.value < num2)
				{
					if (UnityEngine.Random.value < 0.5f)
					{
						vector4 += Custom.RNV() * (UnityEngine.Random.value * 20f * num2);
					}
					else
					{
						vector5 += Custom.RNV() * (UnityEngine.Random.value * 20f * num2);
					}
				}
				if (UnityEngine.Random.value < 1f / Mathf.Lerp(40f, 10f, num2))
				{
					sLeaser.sprites[firstSprite + i].scaleX = 1f;
					if (flag)
					{
						sLeaser.sprites[firstSprite + i].alpha = 0f;
					}
					else
					{
						sLeaser.sprites[firstSprite + i].alpha = Mathf.Pow(UnityEngine.Random.value, Mathf.Lerp(2f, 0.2f, num2));
					}
					if (UnityEngine.Random.value < 0.5f)
					{
						vector4 = Vector2.Lerp(vector5, vector, UnityEngine.Random.value * UnityEngine.Random.value);
					}
					else
					{
						vector5 = Vector2.Lerp(vector4, vector, UnityEngine.Random.value * UnityEngine.Random.value);
					}
				}
				else
				{
					sLeaser.sprites[firstSprite + i].scaleX = 2f;
					if (flag)
					{
						sLeaser.sprites[firstSprite + i].alpha = 0f;
					}
					else
					{
						sLeaser.sprites[firstSprite + i].alpha = ((UnityEngine.Random.value >= num2) ? 1f : (1f - UnityEngine.Random.value * num2));
					}
				}
				sLeaser.sprites[firstSprite + i].x = vector4.x - camPos.x;
				sLeaser.sprites[firstSprite + i].y = vector4.y - camPos.y;
				sLeaser.sprites[firstSprite + i].rotation = Custom.AimFromOneVectorToAnother(vector4, vector5);
				sLeaser.sprites[firstSprite + i].scaleY = Vector2.Distance(vector4, vector5);
				sLeaser.sprites[firstSprite + i].color = white;
				if (flag)
				{
					sLeaser.sprites[firstSprite + i].alpha = Mathf.Lerp(1f, 0f, TargetAnimProgress);
				}
				else
				{
					sLeaser.sprites[firstSprite + i].alpha = Mathf.Lerp(1f, 0.75f, TargetAnimProgress);
				}
				sLeaser.sprites[firstSprite + i].isVisible = TargetVisible && (num < 0.9f || TargetAnimProgress < 0.9f);
			}
			Vector2 vector6 = vector3 + Custom.DegToVec(0f) * Mathf.Lerp(0f, 48f, num);
			sLeaser.sprites[firstSprite + 8].alpha = num * 0.2f;
			sLeaser.sprites[firstSprite + 8].x = vector6.x - camPos.x;
			sLeaser.sprites[firstSprite + 8].y = vector6.y - camPos.y;
			sLeaser.sprites[firstSprite + 8].isVisible = TargetVisible;
			sLeaser.sprites[firstSprite + 9].alpha = num;
			sLeaser.sprites[firstSprite + 9].x = vector6.x - camPos.x;
			sLeaser.sprites[firstSprite + 9].y = vector6.y - camPos.y;
			sLeaser.sprites[firstSprite + 9].isVisible = TargetVisible;
		}
	}

	public int segments = 10;

	public int totMyceliumSprites;

	private bool doubleRenderMycelia = true;

	public Vector2 cosmeticLookAt;

	public Vector2 lastComseticLookAt;

	public Vector2 usePos;

	public Vector2 useLookAt;

	public Vector2 useRootPos;

	public Vector2 useRootDir;

	public Vector3 useDir;

	private float zStart;

	private float zEnd;

	private Color earthColor;

	public HologramMatrix holoMatrix;

	public StaticSoundLoop zipLoop;

	public float lastConvoMode;

	public float convoMode;

	public Mycelium[] mycelia;

	public Color myceliaColor;

	private float myceliaStuckAt;

	private float colorMyceliaFrom;

	private float myceliaConRad;

	public float[,] myceliaMovements;

	private float holoLensUp;

	private float lastHoloLensUp;

	public SafariCursor safariCursor;

	private float totalLength = 1f;

	private Overseer overseer => base.owner as Overseer;

	public int BkgMeshSprite => 0;

	public int BkgBulbSprite => 1;

	public int GlowSprite => 2;

	public int MeshSprite => 3;

	public int BulbSprite => 4;

	public int FirstMyceliumSprite => 5;

	public int WhiteSprite => FirstMyceliumSprite + totMyceliumSprites;

	public int InnerGlowSprite => FirstMyceliumSprite + totMyceliumSprites + 1;

	public int PupilSprite => FirstMyceliumSprite + totMyceliumSprites + 2;

	public override bool ShouldBeCulled
	{
		get
		{
			if (overseer.SafariOverseer)
			{
				return false;
			}
			return base.ShouldBeCulled;
		}
	}

	public Color MainColor
	{
		get
		{
			if (overseer.SafariOverseer && OwnerRoom != null)
			{
				return PlayerGraphics.DefaultSlugcatColor(OwnerRoom.game.StoryCharacter);
			}
			if (overseer.SandboxOverseer)
			{
				return PlayerGraphics.DefaultSlugcatColor(SlugcatStats.Name.ArenaColor(overseer.editCursor.playerNumber));
			}
			if ((overseer.abstractCreature.abstractAI as OverseerAbstractAI).ownerIterator == 1)
			{
				return new Color(1f, 0.8f, 0.3f);
			}
			if ((overseer.abstractCreature.abstractAI as OverseerAbstractAI).ownerIterator == 2)
			{
				return new Color(0f, 1f, 0f);
			}
			if (ModManager.MSC && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).ownerIterator == 3)
			{
				return new Color(1f, 0.2f, 0f);
			}
			if (ModManager.MSC && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).ownerIterator == 4)
			{
				return new Color(0.9f, 0.95f, 1f);
			}
			if (ModManager.MSC && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).ownerIterator == 5)
			{
				return new Color(0.56f, 0.27f, 0.68f);
			}
			if (!ModManager.MSC && (overseer.PlayerGuide || (overseer.abstractCreature.abstractAI as OverseerAbstractAI).ownerIterator == 3))
			{
				return new Color(1f, 0.8f, 0.3f);
			}
			return new Color(38f / 85f, 46f / 51f, 0.768627465f);
		}
	}

	private Color NeutralColor => (new Color(1f, 1f, 1f) + earthColor) / 2f;

	public Room OwnerRoom => overseer.room;

	public OverseerGraphics(PhysicalObject ow)
		: base(ow, internalContainers: false)
	{
		UnityEngine.Random.State state = UnityEngine.Random.state;
		UnityEngine.Random.InitState(overseer.abstractCreature.ID.RandomSeed);
		int num = (int)Mathf.Lerp(Mathf.Lerp(2f, 6f, Mathf.Lerp(UnityEngine.Random.value, Mathf.InverseLerp(0.5f, 1f, overseer.size), Mathf.Pow(UnityEngine.Random.value, 0.5f))), 4f, UnityEngine.Random.value);
		mycelia = new Mycelium[num];
		for (int i = 0; i < mycelia.Length; i++)
		{
			mycelia[i] = new Mycelium(overseer.neuronSystem, this, i, Custom.LerpMap(overseer.size, 0.5f, 1f, 55f, 80f), overseer.mainBodyChunk.pos);
			mycelia[i].moveAwayFromWalls = false;
			mycelia[i].useStaticCulling = false;
			totMyceliumSprites++;
			if (doubleRenderMycelia)
			{
				totMyceliumSprites++;
			}
		}
		myceliaConRad = mycelia[0].conRad / 2f;
		totalSprites = 8 + totMyceliumSprites;
		holoMatrix = new HologramMatrix(this, totalSprites);
		AddSubModule(holoMatrix);
		if (overseer.SafariOverseer)
		{
			safariCursor = new SafariCursor(this, totalSprites);
			AddSubModule(safariCursor);
		}
		myceliaStuckAt = Custom.LerpMap(overseer.size, 0.5f, 1f, 0.5f, 0.2f);
		colorMyceliaFrom = Custom.LerpMap(overseer.size, 0.5f, 1f, 0.5f, 0.3f);
		zipLoop = new StaticSoundLoop(SoundID.Overseer_Zip_LOOP, overseer.mainBodyChunk.pos, overseer.room, 1f, Custom.LerpMap(overseer.size, 0.5f, 1f, 1.5f, 0.5f));
		myceliaMovements = new float[2, 5];
		for (int j = 0; j < myceliaMovements.GetLength(0); j++)
		{
			myceliaMovements[j, 0] = UnityEngine.Random.value;
			myceliaMovements[j, 3] = 1f;
		}
		UnityEngine.Random.state = state;
		holoLensUp = ((overseer.AI.bringUpLens < 0.5f) ? 0f : 1f);
		lastHoloLensUp = holoLensUp;
		Reset();
	}

	public override void Reset()
	{
		base.Reset();
		UpdateDrawPositions(1f);
		for (int i = 0; i < mycelia.Length; i++)
		{
			mycelia[i].Reset(DrawPosOfSegment(0f, 1f));
		}
	}

	public void UpdateNeuronSystemForMycelia()
	{
		for (int i = 0; i < mycelia.Length; i++)
		{
			if (mycelia[i].system != overseer.neuronSystem)
			{
				if (mycelia[i].system != null)
				{
					mycelia[i].system.mycelia.Remove(mycelia[i]);
				}
				if (overseer.neuronSystem != null)
				{
					overseer.neuronSystem.mycelia.Add(mycelia[i]);
				}
				mycelia[i].system = overseer.neuronSystem;
			}
		}
	}

	public void Emerge()
	{
		for (int i = 0; i < mycelia.Length; i++)
		{
			mycelia[i].Reset(DrawPosOfSegment(0f, 1f));
		}
	}

	public override void Update()
	{
		UpdateDrawPositions(1f);
		lastComseticLookAt = cosmeticLookAt;
		cosmeticLookAt = overseer.AI.CosmeticLookAt;
		lastConvoMode = convoMode;
		if (overseer.mode == Overseer.Mode.Conversing)
		{
			convoMode = Mathf.Min(1f, convoMode + 1f / 30f);
		}
		else
		{
			convoMode = Mathf.Max(0f, convoMode - 1f / 30f);
		}
		lastHoloLensUp = holoLensUp;
		if (overseer.AI.bringUpLens > 0.7f)
		{
			holoLensUp = Mathf.Min(1f, holoLensUp + 1f / 30f);
		}
		else if (overseer.AI.bringUpLens < 0.3f)
		{
			holoLensUp = Mathf.Max(0f, holoLensUp - 1f / 30f);
		}
		else if (holoLensUp > 0.5f)
		{
			holoLensUp = Mathf.Min(1f, holoLensUp + 1f / 30f);
		}
		else if (holoLensUp <= 0.5f)
		{
			holoLensUp = Mathf.Max(0f, holoLensUp - 1f / 30f);
		}
		holoLensUp = Mathf.Min(holoLensUp, 1f - convoMode, 1f - overseer.dying);
		if (overseer.mode == Overseer.Mode.Zipping)
		{
			holoLensUp = ((overseer.AI.bringUpLens < 0.5f) ? 0f : 1f);
		}
		if (overseer.dying > 0f)
		{
			if (overseer.room.ViewedByAnyCamera(overseer.mainBodyChunk.pos, 400f))
			{
				for (int i = 0; i < 10; i++)
				{
					overseer.room.AddObject(new OverseerEffect(DrawPosOfSegment(UnityEngine.Random.value, 1f), Custom.RNV() * (UnityEngine.Random.value * 0.1f), MainColor, Mathf.Lerp(80f, 10f, overseer.dying), Mathf.Lerp(1f, 0.1f, overseer.dying)));
				}
				for (int j = 0; j < 3; j++)
				{
					overseer.room.AddObject(new Spark(DrawPosOfSegment(UnityEngine.Random.value, 1f), overseer.mainBodyChunk.vel * 0.5f + Custom.RNV() * (14f * UnityEngine.Random.value), MainColor, null, 14, 21));
				}
			}
			cosmeticLookAt = overseer.mainBodyChunk.pos + Custom.DirVec(overseer.rootPos, overseer.mainBodyChunk.pos) * 1000f;
		}
		base.Update();
		zipLoop.Update();
		zipLoop.pos = DrawPosOfSegment(0f, 1f);
		zipLoop.volume = 1f - overseer.extended;
		for (int k = 0; k < myceliaMovements.GetLength(0); k++)
		{
			myceliaMovements[k, 0] = Mathf.Lerp(myceliaMovements[k, 1], myceliaMovements[k, 2], Custom.SCurve(myceliaMovements[k, 3], 0.5f));
			myceliaMovements[k, 3] = Mathf.Min(1f, myceliaMovements[k, 3] + myceliaMovements[k, 4]);
			if (UnityEngine.Random.value < 1f / ((k == 0) ? 80f : 20f) && myceliaMovements[k, 3] == 1f)
			{
				if (k == 0)
				{
					myceliaMovements[k, 1] = myceliaMovements[k, 0];
					myceliaMovements[k, 3] = 0f;
					myceliaMovements[k, 2] = myceliaMovements[k, 0] + Mathf.Pow(UnityEngine.Random.value, 3f) * 0.8f * ((UnityEngine.Random.value < 0.5f) ? (-1f) : 1f);
					myceliaMovements[k, 4] = 0.01f / Mathf.Abs(myceliaMovements[k, 1] - myceliaMovements[k, 2]);
				}
				else
				{
					myceliaMovements[k, 1] = myceliaMovements[k, 0];
					myceliaMovements[k, 3] = 0f;
					myceliaMovements[k, 2] = UnityEngine.Random.value;
					myceliaMovements[k, 4] = 0.02f / Mathf.Abs(myceliaMovements[k, 1] - myceliaMovements[k, 2]);
				}
			}
		}
		float urX = (0f - useDir.y) / ((float)Math.PI * 2f);
		float urY = useDir.x / ((float)Math.PI * 2f);
		for (int l = 0; l < mycelia.Length; l++)
		{
			mycelia[l].Update();
			mycelia[l].conRad = myceliaConRad * overseer.extended * Mathf.Lerp(1f, 2f - overseer.size, convoMode);
			Vector2 vector = Custom.DegToVec((float)l / (float)mycelia.Length * 360f);
			vector *= Mathf.Lerp(25f, 15f, myceliaMovements[1, 0]) * overseer.size;
			Vector2 vector2 = overseer.mainBodyChunk.pos + MyceliaPosTo2D(new Vector3(vector.x, vector.y, myceliaMovements[1, 0] * -25f * overseer.size - Custom.LerpMap(overseer.size, 0.5f, 1f, 5f, 0f)), urX, urY, myceliaMovements[0, 0]);
			Vector2 vector3 = Custom.DirVec(overseer.mainBodyChunk.pos, vector2);
			for (int m = 0; m < mycelia[l].points.GetLength(0); m++)
			{
				float num = (float)m / (float)(mycelia[l].points.GetLength(0) - 1);
				mycelia[l].points[m, 2] -= overseer.mainBodyChunk.vel;
				mycelia[l].points[m, 2] *= 0.9f * overseer.extended;
				mycelia[l].points[m, 2] += overseer.mainBodyChunk.vel;
				mycelia[l].points[m, 2] += (Vector2)Vector3.Slerp(-(Vector2)useDir, vector3, 0.5f) * (1f - num);
				mycelia[l].points[m, 2] += (vector2 - mycelia[l].points[m, 0]) * (0.05f * Mathf.Sin(num * (float)Math.PI));
				mycelia[l].points[m, 2] += (Vector2)useDir * (Mathf.Pow(num, 2f) * 0.5f);
				mycelia[l].points[m, 0] = Vector2.Lerp(mycelia[l].points[m, 0], ConnectionPos(m, 1f), 1f - overseer.extended);
			}
			if (mycelia[l].connection == default(Mycelium.MyceliaConnection))
			{
				if (overseer.mode == Overseer.Mode.Conversing && overseer.conversationPartner != null && overseer.conversationPartner.graphicsModule != null)
				{
					Mycelium mycelium = (overseer.conversationPartner.graphicsModule as OverseerGraphics).mycelia[UnityEngine.Random.Range(0, (overseer.conversationPartner.graphicsModule as OverseerGraphics).mycelia.Length)];
					if (mycelium != mycelia[l] && mycelium.owner != base.owner && mycelium.connection == default(Mycelium.MyceliaConnection) && Custom.DistLess(mycelia[l].Base, mycelium.Base, (mycelia[l].length + mycelium.length) * 0.75f))
					{
						mycelia[l].connection = new Mycelium.MyceliaConnection(mycelia[l], mycelium);
						mycelium.connection = mycelia[l].connection;
					}
				}
			}
			else if (overseer.mode != Overseer.Mode.Conversing || mycelia[l].connection.Other(mycelia[l]).connection != mycelia[l].connection)
			{
				mycelia[l].connection.Other(mycelia[l]).connection = default(Mycelium.MyceliaConnection);
				mycelia[l].connection = default(Mycelium.MyceliaConnection);
			}
		}
	}

	public Vector2 MyceliaPosTo2D(Vector3 position, float urX, float urY, float urZ)
	{
		position *= overseer.extended;
		float x = position.x * Mathf.Cos(urZ * (float)Math.PI * 2f) - position.y * Mathf.Sin(urZ * (float)Math.PI * 2f);
		position.y = position.x * Mathf.Sin(urZ * (float)Math.PI * 2f) + position.y * Mathf.Cos(urZ * (float)Math.PI * 2f);
		position.x = x;
		float y = position.y * Mathf.Cos(urX * (float)Math.PI * 2f) - position.z * Mathf.Sin(urX * (float)Math.PI * 2f);
		position.z = position.y * Mathf.Sin(urX * (float)Math.PI * 2f) + position.z * Mathf.Cos(urX * (float)Math.PI * 2f);
		position.y = y;
		float z = position.z * Mathf.Cos(urY * (float)Math.PI * 2f) - position.x * Mathf.Sin(urY * (float)Math.PI * 2f);
		position.x = position.z * Mathf.Sin(urY * (float)Math.PI * 2f) + position.x * Mathf.Cos(urY * (float)Math.PI * 2f);
		position.z = z;
		return new Vector2(position.x, position.y);
	}

	public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
	{
		sLeaser.sprites = new FSprite[totalSprites];
		sLeaser.sprites[GlowSprite] = new FSprite("Futile_White");
		sLeaser.sprites[GlowSprite].scale = 3.125f;
		sLeaser.sprites[GlowSprite].shader = rCam.game.rainWorld.Shaders["FlatLight"];
		sLeaser.sprites[MeshSprite] = TriangleMesh.MakeLongMesh(segments, pointyTip: false, customColor: true);
		sLeaser.sprites[MeshSprite].shader = rCam.game.rainWorld.Shaders["OverseerZip"];
		sLeaser.sprites[BkgMeshSprite] = TriangleMesh.MakeLongMesh(segments, pointyTip: false, customColor: true);
		sLeaser.sprites[BkgMeshSprite].shader = rCam.game.rainWorld.Shaders["OverseerZip"];
		sLeaser.sprites[BulbSprite] = new FSprite("Circle20");
		sLeaser.sprites[BkgBulbSprite] = new FSprite("Circle20");
		sLeaser.sprites[WhiteSprite] = new FSprite("Circle20");
		sLeaser.sprites[InnerGlowSprite] = new FSprite("Circle20");
		sLeaser.sprites[PupilSprite] = new FSprite("pixel");
		sLeaser.sprites[PupilSprite].color = new Color(0f, 0f, 0f, 0.5f);
		for (int i = 0; i < mycelia.Length; i++)
		{
			if (doubleRenderMycelia)
			{
				mycelia[i].InitiateSprites(FirstMyceliumSprite + i * 2, sLeaser, rCam);
				mycelia[i].InitiateSprites(FirstMyceliumSprite + i * 2 + 1, sLeaser, rCam);
			}
			else
			{
				mycelia[i].InitiateSprites(FirstMyceliumSprite + i, sLeaser, rCam);
			}
		}
		base.InitiateSprites(sLeaser, rCam);
		AddToContainer(sLeaser, rCam, null);
	}

	public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
	{
		base.DrawSprites(sLeaser, rCam, timeStacker, camPos);
		if (overseer.room == null)
		{
			return;
		}
		UpdateDrawPositions(timeStacker);
		float num = Mathf.Lerp(overseer.lastExtended, overseer.extended, timeStacker);
		Vector2 p = DrawPosOfSegment(0f, timeStacker);
		if (num < 1f)
		{
			p += Custom.DirVec(p, DrawPosOfSegment(0.001f, timeStacker)) * (5f * overseer.size * (1f - num));
		}
		sLeaser.sprites[GlowSprite].x = p.x - camPos.x;
		sLeaser.sprites[GlowSprite].y = p.y - camPos.y;
		sLeaser.sprites[GlowSprite].color = MainColor;
		sLeaser.sprites[BulbSprite].x = p.x - camPos.x;
		sLeaser.sprites[BulbSprite].y = p.y - camPos.y;
		sLeaser.sprites[BulbSprite].rotation = Custom.VecToDeg(useDir);
		sLeaser.sprites[BulbSprite].scaleX = RadOfSegment(0f, timeStacker) / 10f;
		sLeaser.sprites[BulbSprite].scaleY = RadOfSegment(0f, timeStacker) * Mathf.Lerp(1.2f, 1f, useDir.z) / 10f;
		sLeaser.sprites[BulbSprite].color = ColorOfSegment(0f, timeStacker);
		sLeaser.sprites[BkgBulbSprite].x = p.x - camPos.x;
		sLeaser.sprites[BkgBulbSprite].y = p.y - camPos.y;
		sLeaser.sprites[BkgBulbSprite].rotation = Custom.VecToDeg(useDir);
		sLeaser.sprites[BkgBulbSprite].scaleX = RadOfSegment(0f, timeStacker) / 10f;
		sLeaser.sprites[BkgBulbSprite].scaleY = RadOfSegment(0f, timeStacker) * Mathf.Lerp(1.2f, 1f, useDir.z) / 10f;
		sLeaser.sprites[BkgBulbSprite].color = ColorOfSegment(0f, timeStacker);
		sLeaser.sprites[GlowSprite].alpha = 0.25f * num;
		sLeaser.sprites[WhiteSprite].x = p.x + useDir.x * 4f * num - camPos.x;
		sLeaser.sprites[WhiteSprite].y = p.y + useDir.y * 4f * num - camPos.y;
		sLeaser.sprites[WhiteSprite].rotation = Custom.VecToDeg(useDir);
		sLeaser.sprites[WhiteSprite].scaleX = RadOfSegment(0f, timeStacker) * 0.7f * num / 10f;
		sLeaser.sprites[WhiteSprite].scaleY = RadOfSegment(0f, timeStacker) * Mathf.Lerp(0.35f, 0.7f, useDir.z) * num / 10f;
		sLeaser.sprites[WhiteSprite].color = Color.Lerp(ColorOfSegment(0.75f, timeStacker), new Color(0f, 0f, 1f), 0.5f);
		sLeaser.sprites[InnerGlowSprite].x = p.x + useDir.x * 2.5f * num - camPos.x;
		sLeaser.sprites[InnerGlowSprite].y = p.y + useDir.y * 2.5f * num - camPos.y;
		sLeaser.sprites[InnerGlowSprite].rotation = Custom.VecToDeg(useDir);
		sLeaser.sprites[InnerGlowSprite].scaleX = RadOfSegment(0f, timeStacker) * 0.7f * num * 0.75f / 10f;
		sLeaser.sprites[InnerGlowSprite].scaleY = RadOfSegment(0f, timeStacker) * Mathf.Lerp(0.35f, 0.7f, useDir.z) * num * 0.75f / 10f;
		sLeaser.sprites[PupilSprite].x = p.x + useDir.x * 2f * num + ((Vector2)useDir).normalized.x * Mathf.Sin(((Vector2)useDir).magnitude * (float)Math.PI) * 2f - camPos.x;
		sLeaser.sprites[PupilSprite].y = p.y + useDir.y * 2f * num + ((Vector2)useDir).normalized.y * Mathf.Sin(((Vector2)useDir).magnitude * (float)Math.PI) * 2f - camPos.y;
		float num2 = RadOfSegment(1f, timeStacker);
		Vector2 vector = DrawPosOfSegment(1f, timeStacker);
		vector += Custom.DirVec(DrawPosOfSegment(0.999f, timeStacker), vector);
		float num3 = 0f;
		for (int i = 0; i < segments; i++)
		{
			float f = 1f - (float)i / (float)(segments - 1);
			Vector2 vector2 = DrawPosOfSegment(f, timeStacker);
			float num4 = RadOfSegment(f, timeStacker);
			Vector2 normalized = (vector - vector2).normalized;
			Vector2 vector3 = Custom.PerpendicularVector(normalized);
			float num5 = Vector2.Distance(vector, vector2);
			num3 += num5;
			num5 /= 5f;
			Vector2 vector4 = vector3 * ((num4 + num2) * 0.5f);
			(sLeaser.sprites[MeshSprite] as TriangleMesh).MoveVertice(i * 4, vector - normalized * num5 - vector4 - camPos);
			(sLeaser.sprites[MeshSprite] as TriangleMesh).MoveVertice(i * 4 + 1, vector - normalized * num5 + vector4 - camPos);
			(sLeaser.sprites[MeshSprite] as TriangleMesh).MoveVertice(i * 4 + 2, vector2 + normalized * num5 - vector3 * num4 - camPos);
			(sLeaser.sprites[MeshSprite] as TriangleMesh).MoveVertice(i * 4 + 3, vector2 + normalized * num5 + vector3 * num4 - camPos);
			vector = vector2;
			num2 = num4;
		}
		totalLength = num3;
		for (int j = 0; j < (sLeaser.sprites[MeshSprite] as TriangleMesh).vertices.Length; j++)
		{
			(sLeaser.sprites[BkgMeshSprite] as TriangleMesh).MoveVertice(j, (sLeaser.sprites[MeshSprite] as TriangleMesh).vertices[j]);
		}
		for (int k = 0; k < (sLeaser.sprites[MeshSprite] as TriangleMesh).verticeColors.Length; k++)
		{
			(sLeaser.sprites[MeshSprite] as TriangleMesh).verticeColors[k] = ColorOfSegment(1f - (float)k / (float)((sLeaser.sprites[MeshSprite] as TriangleMesh).verticeColors.Length - 1), timeStacker);
			(sLeaser.sprites[BkgMeshSprite] as TriangleMesh).verticeColors[k] = ColorOfSegment(1f - (float)k / (float)((sLeaser.sprites[MeshSprite] as TriangleMesh).verticeColors.Length - 1), timeStacker);
		}
		for (int l = 0; l < mycelia.Length; l++)
		{
			if (doubleRenderMycelia)
			{
				mycelia[l].DrawSprites(FirstMyceliumSprite + l * 2, sLeaser, rCam, timeStacker, camPos);
				sLeaser.sprites[FirstMyceliumSprite + l * 2].isVisible = !mycelia[l].culled && overseer.extended > 0f;
				mycelia[l].DrawSprites(FirstMyceliumSprite + l * 2 + 1, sLeaser, rCam, timeStacker, camPos);
				sLeaser.sprites[FirstMyceliumSprite + l * 2 + 1].isVisible = !mycelia[l].culled && overseer.extended > 0f;
			}
			else
			{
				mycelia[l].DrawSprites(FirstMyceliumSprite + l, sLeaser, rCam, timeStacker, camPos);
				sLeaser.sprites[FirstMyceliumSprite + l].isVisible = !mycelia[l].culled && overseer.extended > 0f;
			}
		}
		Color color = ColorOfSegment(myceliaStuckAt, timeStacker);
		if (!(color != myceliaColor))
		{
			return;
		}
		myceliaColor = color;
		for (int m = 0; m < mycelia.Length; m++)
		{
			if (doubleRenderMycelia)
			{
				mycelia[m].UpdateColor(myceliaColor, colorMyceliaFrom, FirstMyceliumSprite + m * 2, sLeaser);
				mycelia[m].UpdateColor(myceliaColor, colorMyceliaFrom, FirstMyceliumSprite + m * 2 + 1, sLeaser);
			}
			else
			{
				mycelia[m].UpdateColor(myceliaColor, colorMyceliaFrom, FirstMyceliumSprite + m, sLeaser);
			}
		}
	}

	public override void ApplyPalette(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, RoomPalette palette)
	{
		base.ApplyPalette(sLeaser, rCam, palette);
		earthColor = palette.texture.GetPixel(0, 2);
	}

	public override void AddToContainer(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, FContainer newContatiner)
	{
		for (int i = 0; i < sLeaser.sprites.Length; i++)
		{
			sLeaser.sprites[i].RemoveFromContainer();
			bool flag = i <= BkgBulbSprite;
			if (doubleRenderMycelia && i > FirstMyceliumSprite && i < FirstMyceliumSprite + totMyceliumSprites && i % 2 == 1)
			{
				flag = true;
			}
			if (ModManager.MSC && safariCursor != null && i >= safariCursor.firstSprite && i < safariCursor.firstSprite + safariCursor.totalSprites)
			{
				rCam.ReturnFContainer("HUD2").AddChild(sLeaser.sprites[i]);
			}
			else
			{
				rCam.ReturnFContainer(flag ? "Items" : "Foreground").AddChild(sLeaser.sprites[i]);
			}
		}
	}

	public Color ColorOfSegment(float f, float timeStacker)
	{
		return Color.Lerp(Color.Lerp(Custom.RGB2RGBA((MainColor + new Color(0f, 0f, 1f) + earthColor * 8f) / 10f, 0.5f), Color.Lerp(MainColor, Color.Lerp(NeutralColor, earthColor, Mathf.Pow(f, 2f)), overseer.SandboxOverseer ? 0.15f : 0.5f), ExtensionOfSegment(f, timeStacker)), Custom.RGB2RGBA(MainColor, 0f), Mathf.Lerp(overseer.lastDying, overseer.dying, timeStacker));
	}

	public Vector2 DrawPosOfSegment(float f, float timeStacker)
	{
		Vector2 b = Custom.Bezier(usePos, usePos - (Vector2)useDir * (15f * overseer.size * Mathf.Lerp(overseer.lastExtended, overseer.extended, timeStacker)), useRootPos, useRootPos + useRootDir * (Mathf.Max(40f * overseer.size, Vector2.Distance(usePos, useRootPos) * 0.85f) * Mathf.Lerp(overseer.lastExtended, overseer.extended, timeStacker)), f);
		return Vector2.Lerp(PositionOfZipProg(Mathf.Lerp(zEnd, zStart, overseer.zipMeshDirection ? f : (1f - f))), b, ExtensionOfSegment(f, timeStacker));
	}

	private float ExtensionOfSegment(float f, float timeStacker)
	{
		return Mathf.Pow(Mathf.Max(0f, Mathf.Lerp(overseer.lastExtended, overseer.extended, timeStacker)), Mathf.Lerp(0.1f, 4f, f));
	}

	private float RadOfSegment(float f, float timeStacker)
	{
		return Mathf.Lerp(1f + Mathf.Sin(f * (float)Math.PI), Mathf.Lerp(5f, 0f, Mathf.Pow(f, Custom.LerpMap(totalLength, 20f * overseer.size, 90f * overseer.size, 1.75f, 0.35f))), ExtensionOfSegment(f, timeStacker)) * Mathf.Pow(1f - Mathf.Lerp(overseer.lastDying, overseer.dying, timeStacker), 0.2f);
	}

	private Vector2 PositionOfZipProg(float f)
	{
		f = 1f - f;
		int num = Custom.IntClamp((int)(f * (float)overseer.zipPathCount - 1f), 0, overseer.zipPathCount - 1);
		int num2 = Custom.IntClamp((int)(f * (float)overseer.zipPathCount - 1f) + 1, 0, overseer.zipPathCount - 1);
		return Vector2.Lerp(overseer.room.MiddleOfTile(overseer.zipPath[num]), overseer.room.MiddleOfTile(overseer.zipPath[num2]), Mathf.InverseLerp(num, num2, f * (float)overseer.zipPathCount - 1f));
	}

	private void UpdateDrawPositions(float timeStacker)
	{
		usePos = Vector2.Lerp(overseer.mainBodyChunk.lastPos, overseer.mainBodyChunk.pos, timeStacker);
		useLookAt = Vector2.Lerp(lastComseticLookAt, cosmeticLookAt, timeStacker);
		useDir = Vector3.Slerp(Custom.DirVec(usePos, useLookAt), new Vector3(0f, 0f, 1f), Mathf.InverseLerp(600f, 0f, Vector2.Distance(usePos, useLookAt)) * (1f - Mathf.Lerp(lastConvoMode, convoMode, timeStacker))) * Mathf.Lerp(overseer.lastExtended, overseer.extended, timeStacker);
		useRootPos = Vector2.Lerp(overseer.lastRootPos, overseer.rootPos, timeStacker);
		useRootDir = Vector3.Slerp(overseer.lastRootDir, overseer.rootDir, timeStacker);
		float num = 0.5f / (float)overseer.zipPathCount;
		zStart = Mathf.Min(1f - num * 3f, Custom.SCurve(Mathf.Lerp(overseer.zipProgs[overseer.zipProgs.Length - 1], overseer.zipProgs[overseer.zipProgs.Length - 2], timeStacker), 0.5f));
		zEnd = Mathf.Max(num, Custom.SCurve(Mathf.Lerp(overseer.zipProgs[1], overseer.zipProgs[0], timeStacker), 0.5f));
	}

	public Vector2 ConnectionPos(int index, float timeStacker)
	{
		return DrawPosOfSegment(myceliaStuckAt, timeStacker);
	}

	public Vector2 ResetDir(int index)
	{
		return Custom.RNV();
	}
}
